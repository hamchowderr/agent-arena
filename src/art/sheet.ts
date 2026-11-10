import { REGULAR_KINDS, WORLDS, type EnemyKind } from "../sim/arena/content";
import { deathFrames, hurtFrames, walkFrames } from "./animate";
import { ENEMY_SPRITES, eliteSprite } from "./arena-sprites";
import { bossSprite } from "./bosses";
import { bossClips } from "./clips";
import { ENEMY_ART_TIER, RENDER_SCALE, type ArtTier } from "./art-rules";
import { rgbOf } from "./audit";
import { shade, type ColorGrid } from "./shade";
import { WORLD_LOOKS } from "./world-looks";

export interface Picture {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 255] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function u32(value: number): number[] {
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
}

function concat(parts: readonly (Uint8Array | readonly number[])[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const body = concat([[...type].map((letter) => letter.charCodeAt(0)), data]);
  return concat([u32(data.length), body, u32(crc32(body))]);
}

function storedZlib(raw: Uint8Array): Uint8Array {
  const block = 65535;
  const blocks = Math.max(1, Math.ceil(raw.length / block));
  const out = new Uint8Array(2 + blocks * 5 + raw.length + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  let at = 2;
  for (let index = 0; index < blocks; index += 1) {
    const start = index * block;
    const end = Math.min(raw.length, start + block);
    const length = end - start;
    out.set([index === blocks - 1 ? 1 : 0, length & 255, length >>> 8, ~length & 255, (~length >>> 8) & 255], at);
    at += 5;
    out.set(raw.subarray(start, end), at);
    at += length;
  }
  out.set(u32(adler32(raw)), at);
  return out;
}

export function encodePng(picture: Picture): Uint8Array {
  const stride = picture.width * 4;
  const raw = new Uint8Array((stride + 1) * picture.height);
  for (let y = 0; y < picture.height; y += 1) {
    raw[y * (stride + 1)] = 0;
    raw.set(picture.rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const header = concat([u32(picture.width), u32(picture.height), [8, 6, 0, 0, 0]]);
  return concat([[137, 80, 78, 71, 13, 10, 26, 10], chunk("IHDR", header), chunk("IDAT", storedZlib(raw)), chunk("IEND", new Uint8Array())]);
}

class Canvas {
  readonly rgba: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.rgba = new Uint8Array(width * height * 4);
  }

  fill(x: number, y: number, width: number, height: number, hex: string): void {
    const { r, g, b } = rgbOf(hex);
    for (let row = Math.max(0, y); row < Math.min(this.height, y + height); row += 1) {
      for (let column = Math.max(0, x); column < Math.min(this.width, x + width); column += 1) {
        const at = (row * this.width + column) * 4;
        this.rgba[at] = r;
        this.rgba[at + 1] = g;
        this.rgba[at + 2] = b;
        this.rgba[at + 3] = 255;
      }
    }
  }

  draw(grid: ColorGrid, x: number, y: number, scale: number): void {
    grid.forEach((row, gridY) =>
      row.forEach((color, gridX) => {
        if (color !== null) {
          this.fill(x + gridX * scale, y + gridY * scale, scale, scale, color);
        }
      }),
    );
  }
}

const ZOOM = 4;
const TIER_ORDER: readonly ArtTier[] = ["fodder", "mid", "heavy", "boss"];
const GAP = 12;

interface Entry {
  readonly grid: ColorGrid;
  readonly scale: number;
}

function worldEntries(tier: number): Entry[] {
  const world = WORLDS.find((candidate) => candidate.tier === tier);
  const look = Object.entries(WORLD_LOOKS).find(([key]) => Number(key) === tier)?.[1];
  if (!world || !look) {
    return [];
  }
  const kinds = [...new Set<EnemyKind>([...world.slots, "lootRunner"])].sort((a, b) => TIER_ORDER.indexOf(ENEMY_ART_TIER[a]) - TIER_ORDER.indexOf(ENEMY_ART_TIER[b]));
  const regular = kinds.flatMap((kind) => (kind === "boss" ? [] : [{ grid: shade([ENEMY_SPRITES[kind]], look.faction), scale: RENDER_SCALE.regular }]));
  const eliteKind = world.slots[3];
  const elite = eliteKind ? [{ grid: shade([eliteSprite(ENEMY_SPRITES[eliteKind])], look.faction), scale: RENDER_SCALE.elite }] : [];
  return [...regular, ...elite, { grid: shade([bossSprite(world.id)], look.faction), scale: RENDER_SCALE.boss }];
}

export function enemySheet(): Picture {
  const rows = WORLDS.map((world) => ({ tier: world.tier, entries: worldEntries(world.tier) }));
  const sizeOf = (entry: Entry) => ({ width: (entry.grid[0]?.length ?? 0) * entry.scale * ZOOM, height: entry.grid.length * entry.scale * ZOOM });
  const rowHeights = rows.map((row) => Math.max(...row.entries.map((entry) => sizeOf(entry).height)) + GAP * 2);
  const width = Math.max(...rows.map((row) => row.entries.reduce((sum, entry) => sum + sizeOf(entry).width + GAP, GAP)));
  const height = rowHeights.reduce((sum, value) => sum + value, 0);
  const canvas = new Canvas(width, height);
  let top = 0;
  rows.forEach((row, index) => {
    const rowHeight = rowHeights[index] ?? 0;
    const look = Object.entries(WORLD_LOOKS).find(([key]) => Number(key) === row.tier)?.[1];
    canvas.fill(0, top, width, rowHeight, look?.ground[0] ?? "#000000");
    let left = GAP;
    for (const entry of row.entries) {
      const size = sizeOf(entry);
      canvas.draw(entry.grid, left, top + rowHeight - GAP - size.height, entry.scale * ZOOM);
      left += size.width + GAP;
    }
    top += rowHeight;
  });
  return { width, height, rgba: canvas.rgba };
}

const ANIMATION_ZOOM = 4;

export function animationSheet(): Picture {
  const look = WORLD_LOOKS[1];
  return framesSheet(
    REGULAR_KINDS.map((kind) => {
    const walk = walkFrames(ENEMY_SPRITES[kind]).map((frame) => shade([frame], look.faction));
    const hurt = hurtFrames(walk[0] ?? []);
    const death = deathFrames(shade([ENEMY_SPRITES[kind]], look.faction)).frames;
    return [...walk, ...hurt, ...death];
    }),
    [look.ground[0], look.ground[2]],
    ANIMATION_ZOOM,
  );
}

export function bossSheet(): Picture {
  return framesSheet(
    WORLDS.map((world) => {
      const clips = bossClips(world.id, WORLD_LOOKS[world.tier].faction);
      return [...clips.moving, ...clips.death.frames];
    }),
    WORLDS.map((world) => WORLD_LOOKS[world.tier].ground[0]),
    2,
  );
}

function framesSheet(rows: readonly (readonly ColorGrid[])[], grounds: readonly string[], zoom: number): Picture {

  const widthOf = (grid: ColorGrid) => (grid[0]?.length ?? 0) * zoom;
  const heightOf = (grid: ColorGrid) => grid.length * zoom;
  const rowHeights = rows.map((row) => Math.max(...row.map(heightOf)) + GAP * 2);
  const width = Math.max(...rows.map((row) => row.reduce((sum, grid) => sum + widthOf(grid) + GAP, GAP)));
  const height = rowHeights.reduce((sum, value) => sum + value, 0);
  const canvas = new Canvas(width, height);
  let top = 0;
  rows.forEach((row, index) => {
    const rowHeight = rowHeights[index] ?? 0;
    canvas.fill(0, top, width, rowHeight, grounds[index % grounds.length] ?? "#000000");
    let left = GAP;
    for (const grid of row) {
      canvas.draw(grid, left, top + rowHeight - GAP - heightOf(grid), zoom);
      left += widthOf(grid) + GAP;
    }
    top += rowHeight;
  });
  return { width, height, rgba: canvas.rgba };
}
