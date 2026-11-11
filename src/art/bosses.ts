import type { WorldId } from "../sim/arena/content";
import { light, lightAll, RAMPS, tinted } from "./form";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

export type BossPose = "idle" | "windup" | "impact";

export interface BossLook {
  readonly flicker: number;
  readonly angry: boolean;
}

const CALM: BossLook = { flicker: 0, angry: false };

const { paper, blue, yellow, green, purple, charcoal, teal, steel, red, orange, olive, fur, tan } = RAMPS;

function shades(r: Raster, x: number, y: number, width: number, angry: boolean): void {
  r.rect(x, y, width, 3, "k").rect(x + 1, y + 3, width - 2, 1, "k");
  r.set(x + 1, y + 1, "w").set(x + 2, y + 1, "w");
  if (angry) {
    r.line(x - 1, y - 3, x + width / 2, y - 1, "k").line(x + width / 2, y - 1, x + width, y - 3, "k");
  }
}

function growthPeacock(look: BossLook): Sprite {
  const r = new Raster(72, 66);
  const [cx, cy] = [26, 44];
  for (let i = 0; i < 9; i += 1) {
    const angle = Math.PI * (1.05 + i * 0.115) - (look.angry ? 0.05 : 0);
    const reach = 26 + (i % 2) * 3;
    const tipX = cx + Math.cos(angle) * reach;
    const tipY = cy + Math.sin(angle) * reach;
    const side = 0.09;
    r.polygon([[cx, cy], [cx + Math.cos(angle - side) * reach, cy + Math.sin(angle - side) * reach], [cx + Math.cos(angle + side) * reach, cy + Math.sin(angle + side) * reach]], green.base);
    r.ellipse(tipX, tipY, 3.5, 3.5, teal.base);
  }
  lightAll(r, green, teal);
  for (let i = 0; i < 9; i += 1) {
    const angle = Math.PI * (1.05 + i * 0.115) - (look.angry ? 0.05 : 0);
    const reach = 26 + (i % 2) * 3;
    r.ellipse(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach, 1.5, 1.5, (i + look.flicker) % 3 === 0 ? yellow.hi : blue.shadow);
  }
  const chart: readonly (readonly [number, number])[] = [[4, 44], [14, 42], [22, 39], [28, 30], [32, 14]];
  chart.slice(1).forEach(([x, y], index) => {
    const [px, py] = chart[index] ?? [x, y];
    r.line(px, py, x, y, red.light).line(px + 1, py, x + 1, y, red.light);
  });
  r.polygon([[29, 15], [33, 9], [36, 16]], red.light);
  r.line(41, 58, 40, 65, charcoal.base).line(48, 58, 49, 65, charcoal.base).rect(38, 65, 4, 1, charcoal.base).rect(48, 65, 4, 1, charcoal.base);
  r.ellipse(45, 47, 11, 12, blue.base);
  r.polygon([[44, 38], [52, 38], [57, 18], [51, 16]], blue.base);
  r.ellipse(56, 14, 6, 6, blue.base);
  light(r, blue);
  r.polygon([[61, 13], [68, 15 + (look.angry ? 1 : 0)], [61, 17]], yellow.base);
  for (const [x, y] of [[52, 2], [55, 1], [58, 2]] as const) {
    r.line(55, 8, x, y + 1, teal.base).set(x, y, yellow.hi);
  }
  shades(r, 51, 11, 10, look.angry);
  r.line(58, 19, 62, 18, "k");
  r.line(38, 46, 44, 52, blue.shadow).line(40, 44, 47, 50, blue.shadow);
  return tinted(r);
}

function archivistOwl(look: BossLook): Sprite {
  const r = new Raster(62, 72);
  r.rect(4, 61, 54, 10, olive.base).rect(8, 52, 46, 9, green.base);
  light(r, green);
  for (let x = 10; x < 54; x += 5) {
    r.rect(x, 53, 1, 7, green.shadow);
  }
  for (let x = 7; x < 56; x += 7) {
    r.rect(x, 62, 1, 8, green.shadow);
  }
  r.ring(31, 61, 3, 3, 1, steel.base).rect(27, 62, 9, 7, yellow.base).rect(27, 62, 9, 1, yellow.light);
  r.rect(31, 64, 1, 3, "k");
  r.ellipse(31, 34, 18, 20, fur.base);
  r.polygon([[14, 18], [16, 4], [23, 13]], fur.base).polygon([[48, 18], [46, 4], [39, 13]], fur.base);
  light(r, fur);
  r.ellipse(32, 41, 11, 11, fur.light);
  for (const [x, y] of [[27, 36], [33, 38], [29, 43], [36, 44], [31, 48]] as const) {
    r.set(x, y, fur.shadow).set(x + 1, y + 1, fur.shadow).set(x + 2, y, fur.shadow);
  }
  for (const x of [24, 38]) {
    r.ellipse(x, 24, 7, 7, paper.light);
    r.ring(x, 24, 5, 5, 1, "k");
    const blink = look.flicker === 3 && !look.angry;
    if (blink) {
      r.rect(x - 2, 24, 5, 1, "k");
    } else {
      r.ellipse(x, 24, 2.5, 2.5, look.angry ? red.light : yellow.base).rect(x, 24, 2, 2, "k").set(x, 24, "w");
    }
  }
  r.rect(29, 23, 4, 1, "k");
  if (look.angry) {
    r.line(17, 15, 27, 19, "k").line(35, 19, 45, 15, "k");
  }
  r.polygon([[29, 29], [33, 29], [31, 35]], orange.base);
  r.polygon([[45, 30], [52, 36], [49, 48], [44, 46]], fur.shadow);
  r.line(47, 42, 57, 30 - (look.flicker % 3), steel.base).line(48, 42, 58, 30 - (look.flicker % 3), steel.base);
  r.ring(58, 27 - (look.flicker % 3), 3, 3, 1, steel.base).rect(50, 39, 2, 2, steel.base);
  r.rect(22, 52, 3, 2, orange.base).rect(36, 52, 3, 2, orange.base);
  return tinted(r);
}

function throttlerPython(look: BossLook): Sprite {
  const r = new Raster(72, 62);
  r.ellipse(33, 26, 19, 19, steel.base);
  light(r, steel);
  r.ellipse(33, 26, 15, 15, paper.light);
  for (let step = 0; step <= 8; step += 1) {
    const angle = Math.PI * (0.85 + (step / 8) * 1.3);
    const color = step >= 6 ? red.base : step >= 4 ? yellow.base : green.base;
    r.line(33 + Math.cos(angle) * 11, 26 + Math.sin(angle) * 11, 33 + Math.cos(angle) * 14, 26 + Math.sin(angle) * 14, color);
  }
  const needle = Math.PI * (1.6 + look.flicker * 0.06);
  r.line(33, 27, 33 + Math.cos(needle) * 12, 27 + Math.sin(needle) * 12, red.base).line(34, 27, 34 + Math.cos(needle) * 12, 27 + Math.sin(needle) * 12, red.base);
  r.ellipse(33.5, 27, 2, 2, charcoal.base);
  r.ellipse(36, 53, 33, 8, purple.base).ellipse(33, 43, 26, 6, purple.base);
  r.polygon([[54, 46], [64, 46], [66, 22], [58, 22]], purple.base);
  r.ellipse(61, 16, 8, 6.5, purple.base);
  r.polygon([[65, 11], [71, 14], [67, 20]], purple.base);
  light(r, purple);
  r.line(10, 48, 58, 48, purple.shadow).line(10, 39, 56, 39, purple.shadow);
  for (let x = 12; x < 60; x += 8) {
    r.set(x, 43, yellow.light).set(x + 1, 42, yellow.light).set(x + 1, 44, yellow.light).set(x + 2, 43, yellow.light);
    r.set(x + 4, 53, yellow.light).set(x + 5, 52, yellow.light).set(x + 5, 54, yellow.light).set(x + 6, 53, yellow.light);
  }
  r.rect(60, 12, 3, 3, look.angry ? red.light : yellow.base).rect(61, 12, 1, 3, "k");
  r.line(58, 10, 63, 11, "k");
  if (look.flicker % 2 === 1 || look.angry) {
    r.line(70, 17, 71, 20, red.base).set(70, 21, red.base);
  }
  r.line(64, 19, 69, 18, "k");
  return tinted(r);
}

function processBeaver(look: BossLook): Sprite {
  const r = new Raster(62, 72);
  r.ellipse(10, 62, 9, 5, tan.shadow);
  for (let x = 4; x < 17; x += 3) {
    r.line(x, 58, x + 2, 66, tan.line);
  }
  r.ellipse(30, 46, 17, 20, tan.base).ellipse(33, 22, 13, 12, tan.base);
  r.ellipse(22, 67, 5, 3, tan.base).ellipse(38, 67, 5, 3, tan.base);
  light(r, tan);
  r.ellipse(32, 50, 10, 13, tan.light);
  r.ellipse(33, 11, 12, 6, yellow.base).rect(21, 11, 25, 7, ".");
  r.rect(19, 11, 29, 2, yellow.base);
  light(r, yellow);
  r.rect(31, 5, 4, 1, yellow.hi);
  for (const x of [27, 38]) {
    r.rect(x, 19, 3, 3, "k").set(x, 19, "w");
  }
  if (look.angry) {
    r.line(25, 16, 31, 18, "k").line(36, 18, 42, 16, "k");
  }
  r.ellipse(34, 26, 2.5, 2, "k");
  r.rect(32, 30, 5, 5, "w").rect(34, 30, 1, 5, "k").rect(31, 29, 7, 1, "k");
  r.rect(42, 36, 15, 20, tan.shadow).rect(44, 39, 11, 15, paper.light).rect(47, 35, 5, 3, steel.base);
  for (let row = 0; row < 3; row += 1) {
    const y = 41 + row * 4;
    r.rect(45, y, 3, 3, paper.shadow).set(46, y + 1, paper.light);
    if (row < 1 + (look.flicker % 3)) {
      r.set(45, y + 1, green.base).set(46, y + 2, green.base).set(47, y, green.base);
    }
    r.rect(49, y + 1, 5 - row, 1, steel.shadow);
  }
  r.line(40, 48, 44, 46, tan.shadow).line(40, 49, 44, 47, tan.shadow);
  return tinted(r);
}

function expertPuffer(look: BossLook): Sprite {
  const r = new Raster(66, 62);
  const puff = look.angry ? 2 : 0;
  for (let ray = 0; ray < 7; ray += 1) {
    const angle = Math.PI * (1.12 + ray * 0.13);
    const reach = 27 + puff + (look.flicker % 3);
    r.line(32 + Math.cos(angle) * 24, 30 + Math.sin(angle) * 24, 32 + Math.cos(angle) * reach, 30 + Math.sin(angle) * reach, yellow.light);
  }
  r.polygon([[11, 30], [1, 20], [3, 30], [1, 40]], orange.shadow);
  for (let spike = 0; spike < 18; spike += 1) {
    const angle = (spike / 18) * Math.PI * 2;
    const base = 20 + puff;
    r.line(33 + Math.cos(angle) * base, 31 + Math.sin(angle) * (base - 2), 33 + Math.cos(angle) * (base + 4), 31 + Math.sin(angle) * (base + 2), orange.shadow);
  }
  r.ellipse(33, 31, 21 + puff, 19 + puff, orange.base);
  light(r, orange);
  r.ellipse(35, 40, 14, 8, yellow.light);
  r.polygon([[30, 34], [36, 31], [38, 38]], orange.shadow);
  shades(r, 34, 22, 20, look.angry);
  r.line(38, 42, 52, 41, "k").line(52, 41, 55, 37, "k").rect(41, 43, 9, 1, "w");
  r.ellipse(60, 12 - (look.flicker % 2), 2, 2, blue.light).set(59, 11 - (look.flicker % 2), "w");
  return tinted(r);
}

const DRAW: Readonly<Record<WorldId, (look: BossLook) => Sprite>> = {
  hustlr: growthPeacock,
  notionally: archivistOwl,
  meterly: throttlerPython,
  synergex: processBeaver,
  trustMe: expertPuffer,
};

export function bossSprite(world: WorldId, look: BossLook = CALM): Sprite {
  return DRAW[world](look);
}
