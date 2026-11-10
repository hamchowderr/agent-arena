import { rgbOf } from "./audit";
import { TRANSPARENT } from "./palette";
import type { ColorGrid } from "./shade";
import type { Sprite } from "./sprites";

export const WALK_FRAMES = 4;
export const HURT_FRAMES = 2;
export const DEATH_FRAMES = 5;
export const HURT_FPS = 10;
export const DEATH_FPS = 10;

const LEG_ROW_SHARE = 0.4;
export const HURT_TINT = "#d8f0ff";
const HURT_MIX: readonly number[] = [0.55, 0.32];

function filledCount(row: string): number {
  let count = 0;
  for (const key of row) {
    if (key !== TRANSPARENT) {
      count += 1;
    }
  }
  return count;
}

export function legRowCount(sprite: Sprite): number {
  const widest = Math.max(...sprite.map(filledCount));
  let count = 0;
  for (let y = sprite.length - 1; y >= 0; y -= 1) {
    const filled = filledCount(sprite[y] ?? "");
    if (filled === 0 || filled > widest * LEG_ROW_SHARE) {
      break;
    }
    count += 1;
  }
  return count < sprite.length / 2 ? count : 0;
}

interface Leg {
  readonly left: number;
  readonly right: number;
}

function legsOf(sprite: Sprite, legRows: number): Leg[] {
  const top = sprite.length - legRows;
  const width = sprite[0]?.length ?? 0;
  const used = Array.from({ length: width }, (_, x) => sprite.slice(top).some((row) => (row[x] ?? TRANSPARENT) !== TRANSPARENT));
  const legs: Leg[] = [];
  let start = -1;
  for (let x = 0; x <= width; x += 1) {
    if (used[x] && start < 0) {
      start = x;
    } else if (!used[x] && start >= 0) {
      legs.push({ left: start, right: x - 1 });
      start = -1;
    }
  }
  return legs;
}

function blank(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => TRANSPARENT));
}

function stamp(target: string[][], row: string, y: number, from: number, to: number, shift: number): void {
  const line = target[y];
  if (!line) {
    return;
  }
  for (let x = from; x <= to; x += 1) {
    const key = row[x] ?? TRANSPARENT;
    const at = x + shift;
    if (key !== TRANSPARENT && at >= 0 && at < line.length) {
      line[at] = key;
    }
  }
}

function walkFrame(sprite: Sprite, legRows: number, legs: readonly Leg[], lift: number, stride: number): Sprite {
  const width = sprite[0]?.length ?? 0;
  const height = sprite.length + 1;
  const grid = blank(width, height);
  const bodyRows = sprite.length - legRows;
  for (let y = 0; y < bodyRows; y += 1) {
    stamp(grid, sprite[y] ?? "", y + 1 - lift, 0, width - 1, 0);
  }
  for (let leg = 0; leg < legs.length; leg += 1) {
    const span = legs[leg];
    if (!span) {
      continue;
    }
    const swing = legs.length > 1 ? (leg % 2 === 0 ? stride : -stride) : 0;
    for (let row = 0; row < legRows; row += 1) {
      const y = bodyRows + row;
      const foot = row === legRows - 1 ? swing : 0;
      stamp(grid, sprite[y] ?? "", y + 1, span.left, span.right, foot);
      if (lift > 0 && row === 0) {
        stamp(grid, sprite[y] ?? "", y, span.left, span.right, 0);
      }
    }
  }
  return grid.map((row) => row.join(""));
}

export function walkFrames(sprite: Sprite): Sprite[] {
  const legRows = legRowCount(sprite);
  const legs = legRows > 0 ? legsOf(sprite, legRows) : [];
  return [
    walkFrame(sprite, legRows, legs, 0, 1),
    walkFrame(sprite, legRows, legs, 1, 0),
    walkFrame(sprite, legRows, legs, 0, -1),
    walkFrame(sprite, legRows, legs, 1, 0),
  ];
}

function hex(r: number, g: number, b: number): string {
  const channel = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function mix(color: string, toward: string, amount: number): string {
  const a = rgbOf(color);
  const b = rgbOf(toward);
  return hex(a.r + (b.r - a.r) * amount, a.g + (b.g - a.g) * amount, a.b + (b.b - a.b) * amount);
}

export function hurtFrames(grid: ColorGrid): ColorGrid[] {
  return HURT_MIX.map((amount) => grid.map((row) => row.map((color) => (color === null ? null : mix(color, HURT_TINT, amount)))));
}

function scramble(value: number): number {
  let state = (value ^ 0x9e3779b9) >>> 0;
  state = Math.imul(state ^ (state >>> 16), 0x85ebca6b) >>> 0;
  state = Math.imul(state ^ (state >>> 13), 0xc2b2ae35) >>> 0;
  return (state ^ (state >>> 16)) >>> 0;
}

export interface DeathSheet {
  readonly frames: readonly ColorGrid[];
  readonly margin: number;
  readonly below: number;
}

interface Chunk {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly colors: readonly (string | null)[][];
  readonly vx: number;
  readonly vy: number;
  readonly drop: number;
}

function brightest(grid: ColorGrid): string {
  let best = "#ffffff";
  let score = -1;
  for (const color of grid.flat()) {
    if (color === null) {
      continue;
    }
    const { r, g, b } = rgbOf(color);
    const value = r + g + b;
    if (value > score && value < 720) {
      score = value;
      best = color;
    }
  }
  return best;
}

function chunksOf(grid: ColorGrid, size: number): Chunk[] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const centerX = width / 2;
  const centerY = height * 0.6;
  const chunks: Chunk[] = [];
  let index = 0;
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const colors = Array.from({ length: size }, (_, dy) => Array.from({ length: size }, (_, dx) => grid[y + dy]?.[x + dx] ?? null));
      if (colors.flat().every((color) => color === null)) {
        continue;
      }
      index += 1;
      const roll = scramble(index * 977 + x * 31 + y);
      const dx = x + size / 2 - centerX;
      const dy = y + size / 2 - centerY;
      const length = Math.max(1, Math.hypot(dx, dy));
      const push = 0.8 + ((roll & 255) / 255) * 0.9;
      const wobble = (((roll >>> 8) & 255) / 255 - 0.5) * 0.8;
      chunks.push({
        x,
        y,
        size,
        colors,
        vx: (dx / length + wobble) * push,
        vy: (dy / length) * push - 0.9,
        drop: ((roll >>> 16) & 255) / 255,
      });
    }
  }
  return chunks;
}

function put(target: (string | null)[][], x: number, y: number, color: string | null): void {
  const row = target[Math.round(y)];
  const column = Math.round(x);
  if (row && color !== null && column >= 0 && column < row.length) {
    row[column] = color;
  }
}

function squashed(grid: ColorGrid, target: (string | null)[][], margin: number): void {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const newHeight = Math.max(1, Math.round(height * 0.75));
  const newWidth = Math.round(width * 1.18);
  const left = margin - Math.round((newWidth - width) / 2);
  const top = margin + (height - newHeight);
  for (let y = 0; y < newHeight; y += 1) {
    for (let x = 0; x < newWidth; x += 1) {
      const color = grid[Math.floor((y * height) / newHeight)]?.[Math.floor((x * width) / newWidth)] ?? null;
      put(target, left + x, top + y, color === null ? null : mix(color, HURT_TINT, 0.45));
    }
  }
}

const BAYER: readonly number[] = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function cloud(target: (string | null)[][], centerX: number, centerY: number, radius: number, light: string, dark: string, thin: number): void {
  for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
    for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
      const dx = x + 0.5 - centerX;
      const dy = (y + 0.5 - centerY) / 0.8;
      const distance = Math.hypot(dx, dy);
      if (distance > radius) {
        continue;
      }
      const threshold = BAYER[(((y % 4) + 4) % 4) * 4 + (((x % 4) + 4) % 4)] ?? 0;
      const hollow = distance < radius * thin;
      if (hollow || threshold < thin * 16 * (distance / radius)) {
        continue;
      }
      put(target, x, y, dx + dy > radius * 0.35 ? dark : light);
    }
  }
}

const PUFFS: readonly (readonly [number, number])[] = [
  [0, 0],
  [-0.32, 0.12],
  [0.32, 0.1],
  [-0.14, -0.22],
  [0.18, -0.2],
];

export function deathFrames(grid: ColorGrid): DeathSheet {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const longest = Math.max(width, height);
  const margin = Math.ceil(longest * 0.6) + 2;
  const below = 3;
  const frameWidth = width + margin * 2;
  const frameHeight = height + margin + below;
  const empty = () => Array.from({ length: frameHeight }, () => Array.from({ length: frameWidth }, (): string | null => null));
  const chunkSize = longest >= 26 ? 3 : 2;
  const chunks = chunksOf(grid, chunkSize);
  const puff = mix(brightest(grid), "#ffffff", 0.35);
  const puffShadow = mix(brightest(grid), "#6a7898", 0.4);
  const centerX = margin + width / 2;
  const centerY = margin + height * 0.6;
  const first = empty();
  squashed(grid, first, margin);
  const frames: ColorGrid[] = [first];
  const reach = longest * 0.13;
  for (let step = 1; step < DEATH_FRAMES; step += 1) {
    const frame = empty();
    const thin = [0, 0, 0.35, 0.62, 0.86][step] ?? 1;
    const grow = longest * (0.2 + step * 0.07);
    for (const [px, py] of PUFFS) {
      cloud(frame, centerX + px * longest * (0.7 + step * 0.15), centerY + py * longest * (0.7 + step * 0.15) - step, grow, puff, puffShadow, thin);
    }
    const keepShare = 1 - step * 0.2;
    const pieceSize = step >= 3 ? 1 : chunkSize;
    for (const chunk of chunks) {
      if (chunk.drop > keepShare) {
        continue;
      }
      const offsetX = chunk.vx * reach * step;
      const offsetY = chunk.vy * reach * step + 0.5 * step * step;
      for (let dy = 0; dy < pieceSize; dy += 1) {
        for (let dx = 0; dx < pieceSize; dx += 1) {
          const color = chunk.colors[dy]?.[dx] ?? chunk.colors.flat().find((candidate) => candidate !== null) ?? null;
          put(frame, margin + chunk.x + dx + offsetX, margin + chunk.y + dy + offsetY, color);
        }
      }
    }
    frames.push(frame);
  }
  return { frames, margin, below };
}
