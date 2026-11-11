import type { WorldId } from "../sim/arena/content";
import { light as lightFull, RAMPS, tinted, type Ramp } from "./form";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

export type BossPose = "idle" | "windup" | "impact";

export interface BossLook {
  readonly flicker: number;
  readonly angry: boolean;
  readonly talking?: boolean;
  readonly dead?: boolean;
  readonly pose?: BossPose;
}

const CALM: BossLook = { flicker: 0, angry: false };

const { paper, blue, yellow, green, purple, charcoal, steel, red, orange, wood, fur, umber, peach, navy, skin, coral, magenta } = RAMPS;

const WIDTH = 56;
const HEIGHT = 72;
const CENTER = 28;
const EYE_Y = 20;

type Point = readonly [number, number];

const LINES = new Set(Object.values(RAMPS).map((ramp) => ramp.line));

function light(r: Raster, ramp: Ramp): void {
  lightFull(r, ramp);
  for (let y = 0; y < r.height; y += 1) {
    for (let x = 0; x < r.width; x += 1) {
      if (r.get(x, y) === ramp.hi) {
        r.set(x, y, ramp.light);
      }
    }
  }
}

function inked(r: Raster): Sprite {
  return tinted(r).map((row) => [...row].map((key) => (LINES.has(key) ? "k" : key)).join(""));
}

function limb(r: Raster, from: Point, to: Point, thickness: number, key: string): void {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const length = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = (-(y1 - y0) / length) * (thickness / 2);
  const ny = ((x1 - x0) / length) * (thickness / 2);
  r.polygon([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], key);
}

function arm(r: Raster, shoulder: Point, hand: Point, sleeve: Ramp, flesh: Ramp): void {
  limb(r, shoulder, hand, 5, sleeve.base);
  light(r, sleeve);
  r.ellipse(hand[0], hand[1], 2.6, 2.6, flesh.light);
}

function headShape(r: Raster, flesh: Ramp): void {
  r.rect(CENTER - 3, 28, 7, 5, flesh.shadow);
  r.ellipse(CENTER - 11, EYE_Y + 1, 2, 2.6, flesh.base).ellipse(CENTER + 11, EYE_Y + 1, 2, 2.6, flesh.base);
  r.ellipse(CENTER, 19, 10.5, 11, flesh.base);
  light(r, flesh);
  r.set(CENTER - 11, EYE_Y + 1, flesh.shadow).set(CENTER + 11, EYE_Y + 1, flesh.shadow);
}

type Mouth = "smile" | "grin" | "smug" | "flat" | "shout" | "gritted";

function face(r: Raster, flesh: Ramp, look: BossLook, calm: Mouth, browKey: string): void {
  const blink = !look.angry && !look.dead && look.flicker === 3;
  for (const x of [CENTER - 6, CENTER + 3]) {
    if (look.dead) {
      r.line(x, EYE_Y - 1, x + 2, EYE_Y + 1, "k").line(x, EYE_Y + 1, x + 2, EYE_Y - 1, "k");
    } else if (blink) {
      r.rect(x, EYE_Y + 1, 3, 1, "k");
    } else {
      r.rect(x, EYE_Y - 1, 3, 3, "w").rect(x + 1, EYE_Y, 2, 2, look.angry ? "r" : "k").set(x + 1, EYE_Y, "w");
    }
  }
  if (look.angry || look.dead) {
    r.line(CENTER - 7, EYE_Y - 4, CENTER - 3, EYE_Y - 2, browKey).line(CENTER + 2, EYE_Y - 2, CENTER + 6, EYE_Y - 4, browKey);
  } else {
    r.rect(CENTER - 6, EYE_Y - 3, 3, 1, browKey).rect(CENTER + 3, EYE_Y - 3, 3, 1, browKey);
  }
  r.set(CENTER, EYE_Y + 3, flesh.shadow).set(CENTER - 1, EYE_Y + 4, flesh.shadow);
  r.set(CENTER - 7, EYE_Y + 3, coral.light).set(CENTER + 6, EYE_Y + 3, coral.light);
  const mouth: Mouth = look.dead ? "flat" : look.talking ? "shout" : look.angry ? "gritted" : calm;
  const y = EYE_Y + 6;
  switch (mouth) {
    case "smile":
      r.rect(CENTER - 2, y, 5, 1, "k").set(CENTER - 3, y - 1, "k").set(CENTER + 3, y - 1, "k");
      break;
    case "grin":
      r.rect(CENTER - 4, y - 1, 9, 3, "k").rect(CENTER - 3, y - 1, 7, 1, "w").rect(CENTER - 2, y + 1, 5, 1, "r");
      break;
    case "smug":
      r.rect(CENTER - 2, y, 4, 1, "k").set(CENTER + 2, y - 1, "k");
      break;
    case "flat":
      r.rect(CENTER - 2, y, 5, 1, "k");
      break;
    case "shout":
      r.rect(CENTER - 2, y - 1, 5, 3, "k").rect(CENTER - 1, y, 3, 2, "r");
      break;
    case "gritted":
      r.rect(CENTER - 3, y - 1, 7, 3, "k").rect(CENTER - 2, y, 5, 1, "w").set(CENTER, y, "k");
      break;
  }
}

function torso(r: Raster, top: Ramp, flare: number): void {
  r.polygon([[CENTER - 13, 37], [CENTER - 9, 32], [CENTER + 9, 32], [CENTER + 13, 37], [CENTER + 12 + flare, 55], [CENTER - 12 - flare, 55]], top.base);
  light(r, top);
}

function legs(r: Raster, pants: Ramp, shoes: Ramp, look: BossLook): void {
  const stance = look.angry ? 1 : 0;
  r.rect(CENTER - 10 - stance, 54, 9, 12, pants.base).rect(CENTER + 1 + stance, 54, 9, 12, pants.base);
  light(r, pants);
  r.ellipse(CENTER - 6 - stance, 67, 5.5, 2.5, shoes.base).ellipse(CENTER + 6 + stance, 67, 5.5, 2.5, shoes.base);
  light(r, shoes);
}

function vest(r: Raster, ramp: Ramp, gap: number): void {
  r.polygon([[CENTER - 13, 37], [CENTER - 9, 32], [CENTER - gap, 32], [CENTER - gap, 55], [CENTER - 13, 55]], ramp.base);
  r.polygon([[CENTER + 13, 37], [CENTER + 9, 32], [CENTER + gap, 32], [CENTER + gap, 55], [CENTER + 13, 55]], ramp.base);
  light(r, ramp);
}

function growthHacker(look: BossLook): Sprite {
  const r = new Raster(WIDTH, HEIGHT);
  const climb = [0, 1, 2, 1][look.flicker % 4] ?? 0;
  const chart: readonly Point[] = [[16, 52], [12, 47], [9, 49], [6, 40], [4, 42], [3, 30 - climb]];
  const line = look.angry ? red.base : green.light;
  chart.slice(1).forEach(([x, y], index) => {
    const [px, py] = chart[index] ?? [x, y];
    r.line(px, py, x, y, line).line(px, py + 1, x, y + 1, line);
  });
  r.polygon([[0, 31 - climb], [3, 25 - climb], [7, 31 - climb]], line);
  legs(r, steel, paper, look);
  r.line(CENTER - 9, 67, CENTER - 4, 66, red.base).line(CENTER + 3, 67, CENTER + 8, 66, red.base);
  torso(r, blue, 0);
  vest(r, charcoal, 3);
  r.line(CENTER + 2, 34, CENTER + 2, 54, steel.light).rect(CENTER + 3, 40, 2, 3, steel.light);
  arm(r, [CENTER - 12, 36], [CENTER - 5, 45], charcoal, skin);
  r.rect(CENTER - 8, 40, 6, 9, "k").rect(CENTER - 7, 41, 4, 7, green.light);
  r.line(CENTER - 5, 47, CENTER - 5, 42, "k").set(CENTER - 6, 43, "k").set(CENTER - 4, 43, "k");
  const pose = look.pose ?? "idle";
  const reach = look.angry ? 3 : 0;
  const hand: Point = pose === "windup" ? [CENTER + 14, 14] : pose === "impact" ? [CENTER + 22, 33] : [CENTER + 18 + reach, 24 - reach];
  arm(r, [CENTER + 12, 36], hand, charcoal, skin);
  const [rx, ry] = pose === "windup" ? [CENTER + 15, 6] : pose === "impact" ? [CENTER + 23, 7] : [CENTER + 19 + reach, 14 - reach];
  r.polygon([[rx - 2, ry + 6], [rx - 2, ry - 2], [rx, ry - 6], [rx + 2, ry - 2], [rx + 2, ry + 6]], paper.light);
  r.rect(rx - 1, ry - 1, 2, 2, blue.light).polygon([[rx - 2, ry + 3], [rx - 4, ry + 7], [rx - 2, ry + 6]], red.base).polygon([[rx + 2, ry + 3], [rx + 4, ry + 7], [rx + 2, ry + 6]], red.base);
  const flame = pose === "impact" ? 16 : pose === "windup" ? 1 : 2 + climb;
  r.rect(rx - 1, ry + 7, 2, flame, yellow.base).set(rx, ry + 7 + flame, red.base);
  headShape(r, skin);
  r.polygon([[CENTER - 11, 18], [CENTER - 11, 11], [CENTER - 6, 6], [CENTER + 4, 5], [CENTER + 11, 9], [CENTER + 12, 17], [CENTER + 8, 12], [CENTER - 2, 11], [CENTER - 8, 13]], yellow.base);
  r.polygon([[CENTER + 1, 6], [CENTER + 10, climb], [CENTER + 8, 8]], yellow.base);
  light(r, yellow);
  r.rect(CENTER - 9, 9, 18, 1, "k").rect(CENTER - 9, 8, 7, 3, "k").rect(CENTER + 2, 8, 7, 3, "k");
  r.set(CENTER - 8, 8, "w").set(CENTER + 3, 8, "w");
  face(r, skin, look, "grin", yellow.shadow);
  return inked(r).map((row) => [...row].reverse().join(""));
}

function archivist(look: BossLook): Sprite {
  const r = new Raster(WIDTH, HEIGHT);
  r.polygon([[CENTER - 12, 54], [CENTER + 12, 54], [CENTER + 14, 66], [CENTER - 14, 66]], wood.base);
  light(r, wood);
  r.ellipse(CENTER - 6, 67, 5, 2.5, purple.shadow).ellipse(CENTER + 6, 67, 5, 2.5, purple.shadow);
  torso(r, purple, 0);
  r.polygon([[CENTER - 5, 32], [CENTER + 5, 32], [CENTER, 39]], paper.light);
  r.ellipse(CENTER, 37, 1.5, 1.5, red.base);
  const swing = [-1, 0, 1, 0][look.flicker % 4] ?? 0;
  r.line(CENTER - 11, 54, CENTER - 12 + swing, 59, steel.base).ring(CENTER - 12 + swing, 61, 2.5, 2.5, 1, steel.base);
  r.rect(CENTER - 14 + swing, 63, 1, 4, steel.base).rect(CENTER - 10 + swing, 63, 1, 3, steel.base);
  const pose = look.pose ?? "idle";
  const top = pose === "windup" ? 0 : pose === "impact" ? 52 : look.angry ? 36 : 40;
  const book = () => {
    r.rect(CENTER - 11, top, 22, 14, red.base);
    light(r, red);
    r.rect(CENTER - 11, top + 12, 22, 2, paper.light).rect(CENTER - 1, top, 2, 12, red.shadow);
    r.ring(CENTER, top + 5, 2.5, 2.5, 1, steel.base).rect(CENTER - 3, top + 6, 7, 5, yellow.base).rect(CENTER, top + 8, 1, 2, "k");
  };
  if (pose !== "windup") {
    book();
  }
  arm(r, [CENTER - 12, 36], [CENTER - 10, top + 7], purple, peach);
  arm(r, [CENTER + 12, 36], [CENTER + 10, top + 7], purple, peach);
  headShape(r, peach);
  r.ellipse(CENTER, 5, 6, 4.5, fur.base);
  r.polygon([[CENTER - 11, 20], [CENTER - 11, 12], [CENTER - 5, 7], [CENTER + 5, 7], [CENTER + 11, 12], [CENTER + 11, 20], [CENTER + 8, 13], [CENTER, 11], [CENTER - 8, 13]], fur.base);
  light(r, fur);
  r.line(CENTER - 3, 3, CENTER + 3, 6, fur.shadow).line(CENTER - 8, 12, CENTER - 2, 9, fur.shadow);
  r.line(CENTER + 5, 2, CENTER + 8, 0, steel.base);
  face(r, peach, look, "smug", fur.shadow);
  for (const x of [CENTER - 7, CENTER + 2]) {
    r.line(x, EYE_Y + 2, x + 4, EYE_Y + 2, "k").set(x, EYE_Y + 1, "k").set(x + 4, EYE_Y + 1, "k");
  }
  r.line(CENTER - 3, EYE_Y + 1, CENTER + 2, EYE_Y + 1, "k");
  r.line(CENTER - 8, EYE_Y + 2, CENTER - 10, EYE_Y + 10, yellow.base).line(CENTER + 7, EYE_Y + 2, CENTER + 9, EYE_Y + 10, yellow.base);
  if (pose === "windup") {
    book();
  }
  return inked(r);
}

function throttler(look: BossLook): Sprite {
  const r = new Raster(WIDTH, HEIGHT);
  legs(r, navy, charcoal, look);
  torso(r, charcoal, 1);
  vest(r, orange, 3);
  for (const y of [42, 48]) {
    r.rect(CENTER - 12, y, 9, 2, paper.light).rect(CENTER + 3, y, 9, 2, paper.light);
  }
  r.rect(CENTER - 12, 53, 24, 2, "k");
  for (const x of [CENTER - 9, CENTER - 6, CENTER + 5, CENTER + 8]) {
    r.rect(x, 51, 2, 4, yellow.base).set(x, 51, yellow.light);
  }
  const ticket = 3 + (look.flicker % 4) * 2;
  arm(r, [CENTER - 12, 36], [CENTER - 14, 47], charcoal, umber);
  r.rect(CENTER - 20, 44, 7, 8, steel.base).rect(CENTER - 19, 45, 5, 2, yellow.light);
  r.rect(CENTER - 19, 52, 5, ticket, paper.light);
  for (let y = 54; y < 52 + ticket; y += 2) {
    r.rect(CENTER - 18, y, 3, 1, paper.shadow);
  }
  const pose = look.pose ?? "idle";
  const raise = look.angry ? 3 : 0;
  const grip: Point = pose === "windup" ? [CENTER + 18, 34] : pose === "impact" ? [CENTER + 14, 46] : [CENTER + 17, 28 - raise];
  const sign: Point = pose === "windup" ? [CENTER + 20, 18] : pose === "impact" ? [CENTER + 20, 59] : [CENTER + 18, 8 - raise];
  arm(r, [CENTER + 12, 36], grip, charcoal, umber);
  r.line(grip[0], grip[1], sign[0], sign[1], steel.base).line(grip[0] + 1, grip[1], sign[0] + 1, sign[1], steel.base);
  const [px, py] = sign;
  r.polygon([[px - 3, py - 7], [px + 3, py - 7], [px + 7, py - 3], [px + 7, py + 3], [px + 3, py + 7], [px - 3, py + 7], [px - 7, py + 3], [px - 7, py - 3]], red.base);
  light(r, red);
  r.rect(px - 5, py - 1, 11, 2, "w");
  headShape(r, umber);
  r.polygon([[CENTER - 11, 15], [CENTER - 10, 8], [CENTER - 4, 4], [CENTER + 4, 4], [CENTER + 10, 8], [CENTER + 11, 15]], red.base);
  light(r, red);
  r.rect(CENTER - 2, 7, 4, 3, yellow.base).set(CENTER - 1, 8, yellow.light);
  r.polygon([[CENTER - 12, 14], [CENTER + 15, 14], [CENTER + 13, 16], [CENTER - 12, 16]], red.shadow);
  face(r, umber, look, "flat", charcoal.base);
  r.polygon([[CENTER - 6, EYE_Y + 4], [CENTER + 5, EYE_Y + 4], [CENTER + 6, EYE_Y + 6], [CENTER, EYE_Y + 5], [CENTER - 7, EYE_Y + 6]], charcoal.base);
  return inked(r);
}

function processOwner(look: BossLook): Sprite {
  const r = new Raster(WIDTH, HEIGHT);
  legs(r, charcoal, wood, look);
  torso(r, paper, 2);
  r.polygon([[CENTER - 1, 33], [CENTER + 1, 33], [CENTER + 2, 46], [CENTER, 49], [CENTER - 2, 46]], red.base);
  light(r, red);
  r.line(CENTER - 5, 32, CENTER - 6, 44, blue.base).line(CENTER + 5, 32, CENTER - 3, 44, blue.base);
  r.rect(CENTER - 8, 44, 6, 7, paper.light).rect(CENTER - 7, 45, 4, 2, blue.base).rect(CENTER - 7, 48, 4, 1, paper.shadow);
  r.rect(CENTER - 13, 53, 26, 2, wood.shadow).rect(CENTER - 1, 53, 2, 2, yellow.light);
  arm(r, [CENTER - 12, 36], [CENTER - 15, 47], paper, umber);
  const board = look.angry ? -3 : 0;
  r.rect(CENTER + 9, 36 + board, 14, 18, wood.base);
  light(r, wood);
  r.rect(CENTER + 10, 38 + board, 12, 15, paper.light).rect(CENTER + 13, 35 + board, 6, 3, steel.base);
  for (let row = 0; row < 4; row += 1) {
    const y = 40 + board + row * 3;
    const ticked = row < look.flicker % 5;
    r.rect(CENTER + 15, y, 2, 2, ticked ? green.base : "k").rect(CENTER + 18, y, 3, 1, paper.shadow);
  }
  arm(r, [CENTER + 12, 36], [CENTER + 11, 46 + board], paper, umber);
  r.line(CENTER - 15, 47, CENTER - 11, 41, "k");
  const pose = look.pose ?? "idle";
  if (pose !== "idle") {
    const [hx, hy]: Point = pose === "windup" ? [CENTER - 18, 16] : [CENTER - 18, 56];
    arm(r, [CENTER - 12, 36], [hx, hy], paper, umber);
    const base = pose === "windup" ? hy - 10 : hy + 6;
    r.rect(hx - 2, pose === "windup" ? base + 4 : hy - 4, 4, 6, wood.base).ellipse(hx, pose === "windup" ? base + 4 : hy - 5, 3, 2, wood.base);
    r.rect(hx - 6, base, 12, 4, red.base).rect(hx - 6, base + 3, 12, 1, red.shadow);
    if (pose === "impact") {
      r.ellipse(hx, 70, 9, 1.5, red.base);
    }
  }
  headShape(r, umber);
  r.rect(CENTER - 11, 13, 3, 7, charcoal.base).rect(CENTER + 9, 13, 3, 7, charcoal.base);
  r.ellipse(CENTER, 10, 12, 7, yellow.base).rect(CENTER - 15, 13, 30, 2, yellow.base);
  light(r, yellow);
  r.rect(CENTER - 15, 15, 30, 1, yellow.shadow).rect(CENTER - 1, 4, 2, 9, yellow.light);
  face(r, umber, look, "smile", charcoal.base);
  for (const x of [CENTER - 7, CENTER + 2]) {
    r.rect(x, EYE_Y - 2, 5, 1, "k").rect(x, EYE_Y + 2, 5, 1, "k").rect(x, EYE_Y - 2, 1, 5, "k").rect(x + 4, EYE_Y - 2, 1, 5, "k");
  }
  r.rect(CENTER - 2, EYE_Y - 1, 4, 1, "k");
  return inked(r);
}

function confidentExpert(look: BossLook): Sprite {
  const r = new Raster(WIDTH, HEIGHT);
  const glow = look.flicker % 3;
  legs(r, blue, magenta, look);
  torso(r, charcoal, 0);
  vest(r, magenta, 4);
  r.line(CENTER - 4, 33, CENTER - 7, 42, magenta.shadow).line(CENTER + 4, 33, CENTER + 7, 42, magenta.shadow);
  const pose = look.pose ?? "idle";
  const raise = look.angry ? 4 : 0;
  const hands: readonly [Point, Point] =
    pose === "windup"
      ? [[CENTER - 21, 30], [CENTER - 17, 34]]
      : pose === "impact"
        ? [[CENTER + 20, 38], [CENTER + 23, 34]]
        : [[CENTER - 21, 27 - raise], [CENTER + 21, 27 - raise]];
  arm(r, [CENTER - 12, 36], hands[0], magenta, skin);
  arm(r, [CENTER + 12, 36], hands[1], magenta, skin);
  const [sx, sy] = pose === "windup" ? [CENTER - 20, 18] : pose === "impact" ? [CENTER + 20, 22] : [CENTER + 20, 15 - raise - (look.flicker % 2)];
  const halo = look.angry ? red : yellow;
  for (let ray = 0; ray < 8; ray += 1) {
    const angle = (ray * Math.PI) / 4 + glow * 0.2;
    const reach = 8 + ((ray + glow) % 2) * 2;
    r.line(sx + Math.cos(angle) * 6, sy + Math.sin(angle) * 6, sx + Math.cos(angle) * reach, sy + Math.sin(angle) * reach, halo.light);
  }
  r.polygon([[sx, sy - 6], [sx + 2, sy - 2], [sx + 6, sy - 1], [sx + 3, sy + 2], [sx + 4, sy + 6], [sx, sy + 4], [sx - 4, sy + 6], [sx - 3, sy + 2], [sx - 6, sy - 1], [sx - 2, sy - 2]], halo.base);
  light(r, halo);
  r.rect(sx - 1, sy - 1, 2, 2, "w");
  headShape(r, skin);
  r.polygon([[CENTER - 11, 17], [CENTER - 11, 10], [CENTER - 5, 5], [CENTER + 6, 4], [CENTER + 12, 8], [CENTER + 11, 14], [CENTER + 4, 9], [CENTER - 6, 11]], wood.base);
  light(r, wood);
  r.line(CENTER - 4, 7, CENTER + 6, 6, wood.light);
  face(r, skin, look, "grin", wood.shadow);
  r.line(CENTER - 11, EYE_Y + 1, CENTER - 6, EYE_Y + 6, charcoal.base).rect(CENTER - 6, EYE_Y + 5, 2, 2, "k");
  if (!look.dead && !look.angry) {
    r.set(CENTER + 5, EYE_Y + 4, "w").set(CENTER + 6, EYE_Y + 3, "w").set(CENTER + 6, EYE_Y + 5, "w").set(CENTER + 7, EYE_Y + 4, "w");
  }
  return inked(r);
}

const DRAW: Readonly<Record<WorldId, (look: BossLook) => Sprite>> = {
  hustlr: growthHacker,
  notionally: archivist,
  meterly: throttler,
  synergex: processOwner,
  trustMe: confidentExpert,
};

export function bossSprite(world: WorldId, look: BossLook = CALM): Sprite {
  return DRAW[world](look);
}

export const BOSS_PORTRAIT_SIZE = 40;

export function bossPortrait(world: WorldId, look: BossLook = CALM): Sprite {
  const sprite = bossSprite(world, look);
  const left = Math.round((sprite[0]?.length ?? 0) / 2) - BOSS_PORTRAIT_SIZE / 2;
  return sprite.slice(0, BOSS_PORTRAIT_SIZE).map((row) => row.slice(left, left + BOSS_PORTRAIT_SIZE));
}
