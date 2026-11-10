import type { WorldId } from "../sim/arena/content";
import { outlined } from "./arena-sprites";
import { paint, Raster } from "./raster";
import type { Sprite } from "./sprites";

export type BossPose = "idle" | "windup" | "impact";

export interface BossLook {
  readonly flicker: number;
  readonly angry: boolean;
}

const CALM: BossLook = { flicker: 0, angry: false };

function shades(raster: Raster, x: number, y: number, width: number): void {
  raster.rect(x, y, width, 4, "k");
  raster.rect(x + width + 6, y, width, 4, "k");
  raster.rect(x + width, y + 1, 6, 1, "k");
  raster.set(x + 1, y + 1, "w").set(x + width + 7, y + 1, "w");
}

function angryBrows(raster: Raster, x: number, y: number, width: number, gap: number): void {
  raster.line(x, y - 3, x + width, y - 1, "k");
  raster.line(x + width + gap, y - 1, x + width * 2 + gap, y - 3, "k");
}

function growthHacker(look: BossLook): Sprite {
  const r = new Raster(50, 74);
  r.polygon([[6, 46], [0, 64], [14, 58]], "7");
  r.polygon([[44, 46], [50, 64], [36, 58]], "7");
  r.ellipse(25, 34, 15, 26, "A");
  paint(r, "3", (_, y) => y < 17);
  r.rect(10, 17, 31, 2, "0");
  shades(r, 12, 25, 10);
  if (look.angry) {
    angryBrows(r, 12, 25, 10, 6);
  }
  r.line(15, 37, 18, 40, "k").line(18, 40, 32, 40, "k").line(32, 40, 35, 37, "k");
  r.rect(19, 38, 12, 2, "w");
  r.line(14, 52, 20, 49, "2").line(20, 49, 24, 50, "2").line(24, 50, 34, 43, "2");
  r.line(14, 53, 20, 50, "2").line(20, 50, 24, 51, "2").line(24, 51, 34, 44, "2");
  r.polygon([[31, 42], [36, 41], [35, 46]], "2");
  r.rect(18, 59, 14, 4, "0");
  const flame = 6 + look.flicker;
  r.polygon([[18, 63], [32, 63], [25, 63 + flame + 3]], "y");
  r.polygon([[21, 63], [29, 63], [25, 63 + flame]], "w");
  return outlined(r.sprite(), "k");
}

function archivist(look: BossLook): Sprite {
  const r = new Raster(48, 74);
  r.rect(8, 4, 36, 60, "A");
  for (let y = 8; y < 62; y += 3) {
    r.line(40, y, 43, y, "0");
  }
  r.rect(4, 2, 36, 62, "4");
  r.rect(4, 2, 4, 62, "D");
  for (let y = 8; y < 60; y += 10) {
    r.rect(1, y, 7, 3, "0");
  }
  r.rect(12, 8, 24, 8, "A");
  r.line(15, 11, 32, 11, "D").line(15, 13, 28, 13, "D");
  r.ring(17, 29, 5, 5, 2, "k");
  r.ring(30, 29, 5, 5, 2, "k");
  r.line(22, 29, 25, 29, "k");
  r.rect(16, 28, 3, 3, look.angry ? "r" : "D");
  r.rect(29, 28, 3, 3, look.angry ? "r" : "D");
  if (look.angry) {
    angryBrows(r, 12, 23, 9, 4);
  }
  r.line(17, 43, 30, 43, "k").line(17, 44, 30, 44, "k");
  r.rect(32, 62, 4, 8 + look.flicker, "3");
  r.rect(10, 64, 6, 6, "D");
  r.rect(22, 64, 6, 6, "D");
  return outlined(r.sprite(), "k");
}

function throttler(look: BossLook): Sprite {
  const r = new Raster(62, 66);
  r.rect(26, 48, 10, 10, "0");
  r.rect(14, 56, 34, 6, "D");
  r.ellipse(31, 28, 29, 27, "0");
  r.ellipse(31, 28, 25, 23, "A");
  for (let step = 0; step <= 8; step += 1) {
    const angle = Math.PI * (0.85 + (step / 8) * 1.3);
    const color = step >= 6 ? "r" : step >= 4 ? "y" : "g";
    r.line(31 + Math.cos(angle) * 18, 30 + Math.sin(angle) * 18, 31 + Math.cos(angle) * 23, 30 + Math.sin(angle) * 23, color);
    r.line(32 + Math.cos(angle) * 18, 30 + Math.sin(angle) * 18, 32 + Math.cos(angle) * 23, 30 + Math.sin(angle) * 23, color);
  }
  const needle = Math.PI * (1.85 + look.flicker * 0.04);
  r.line(31, 30, 31 + Math.cos(needle) * 20, 30 + Math.sin(needle) * 20, "r");
  r.line(32, 30, 32 + Math.cos(needle) * 20, 30 + Math.sin(needle) * 20, "r");
  r.ellipse(31.5, 30, 3, 3, "C");
  r.rect(19, 36, 5, 6, "k").rect(39, 36, 5, 6, "k");
  r.set(20, 37, "w").set(40, 37, "w");
  if (look.angry) {
    r.line(17, 33, 24, 35, "k").line(38, 35, 45, 33, "k");
  }
  r.line(25, 46, 38, 46, "k");
  r.ellipse(6, 10, 3, 3, "C").ellipse(56, 10, 3, 3, "C");
  return outlined(r.sprite(), "k");
}

function processOwner(look: BossLook): Sprite {
  const r = new Raster(52, 70);
  r.rect(2, 6, 48, 58, "C");
  r.rect(6, 12, 40, 48, "A");
  r.rect(16, 2, 20, 8, "0");
  r.rect(22, 0, 8, 4, "0");
  for (let row = 0; row < 3; row += 1) {
    const y = 16 + row * 7;
    r.rect(10, y, 5, 5, "D");
    r.rect(11, y + 1, 3, 3, "A");
    if (row < 1 + (look.flicker % 3)) {
      r.line(11, y + 2, 12, y + 3, "2").line(12, y + 3, 15, y - 1, "2");
    }
    r.line(18, y + 2, 40 - row * 4, y + 2, "6");
  }
  r.rect(14, 40, 6, 5, "k").rect(32, 40, 6, 5, "k");
  r.set(15, 41, "w").set(33, 41, "w");
  if (look.angry) {
    angryBrows(r, 13, 40, 7, 11);
  }
  r.line(19, 50, 21, 52, "k").line(21, 52, 31, 52, "k").line(31, 52, 33, 50, "k");
  r.rect(44, 18, 3, 30, "6");
  r.rect(44, 46, 3, 3, "0");
  r.rect(10, 64, 6, 6, "D").rect(36, 64, 6, 6, "D");
  return outlined(r.sprite(), "k");
}

function confidentExpert(look: BossLook): Sprite {
  const r = new Raster(56, 70);
  r.ellipse(28, 26, 26, 25, "1");
  r.polygon([[14, 42], [42, 42], [38, 54], [18, 54]], "1");
  for (let y = 54; y < 64; y += 3) {
    r.rect(18, y, 20, 2, "0");
    r.rect(19, y + 2, 18, 1, "D");
  }
  r.rect(23, 64, 10, 4, "D");
  r.line(22, 46, 26, 34, "C").line(26, 34, 30, 46, "C").line(30, 46, 34, 34, "C");
  shades(r, 10, 20, 14);
  if (look.angry) {
    angryBrows(r, 10, 20, 14, 6);
  }
  r.line(17, 31, 21, 34, "k").line(21, 34, 35, 34, "k").line(35, 34, 40, 29, "k");
  for (let ray = 0; ray < 5; ray += 1) {
    const angle = Math.PI * (1.15 + ray * 0.17);
    const reach = 30 + (look.flicker % 3);
    r.line(28 + Math.cos(angle) * 28, 26 + Math.sin(angle) * 28, 28 + Math.cos(angle) * reach, 26 + Math.sin(angle) * reach, "y");
  }
  return outlined(r.sprite(), "k");
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
