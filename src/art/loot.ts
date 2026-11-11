import { BIG_GEM, CHEST, GEM } from "./arena-sprites";
import { light, RAMPS, tinted } from "./form";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

const { yellow, teal, purple } = RAMPS;

export type TokenTier = 0 | 1 | 2 | 3;

export const TOKEN_TIERS: readonly TokenTier[] = [0, 1, 2, 3];

const TIER_FLOOR: Readonly<Record<TokenTier, number>> = { 0: 1, 1: 2, 2: 6, 3: 30 };

export function tokenTier(value: number): TokenTier {
  return [...TOKEN_TIERS].reverse().find((tier) => value >= TIER_FLOOR[tier]) ?? 0;
}

function coins(r: Raster, centerX: number, bottom: number, count: number): number {
  let top = bottom;
  for (let index = 0; index < count; index += 1) {
    top = bottom - index * 3;
    r.ellipse(centerX, top + 1, 5.5, 2.2, yellow.shadow).ellipse(centerX, top, 5.5, 2, yellow.base);
  }
  return top;
}

function stamp(r: Raster, centerX: number, top: number): void {
  r.rect(centerX - 1, top - 1, 3, 1, yellow.line).set(centerX, top, yellow.line);
}

function tokenStack(): Sprite {
  const r = new Raster(13, 15);
  const top = coins(r, 6, 12, 4);
  light(r, yellow);
  stamp(r, 6, top);
  r.set(2, top, "w");
  return tinted(r);
}

function tokenJackpot(): Sprite {
  const r = new Raster(23, 21);
  const left = coins(r, 6, 17, 3);
  const right = coins(r, 16, 17, 4);
  const middle = coins(r, 11, 18, 2);
  light(r, yellow);
  stamp(r, 6, left);
  stamp(r, 11, middle);
  r.polygon([[16, right - 8], [19, right - 4], [16, right], [13, right - 4]], teal.base);
  light(r, teal);
  r.set(15, right - 5, "w").set(2, 3, "w").set(1, 4, yellow.hi).set(3, 4, yellow.hi).set(2, 5, yellow.hi).set(21, 1, "w");
  return tinted(r);
}

export const TOKEN_SPRITES: Readonly<Record<TokenTier, Sprite>> = {
  0: GEM,
  1: BIG_GEM,
  2: tokenStack(),
  3: tokenJackpot(),
};

function bossChest(): Sprite {
  const r = new Raster(21, 15);
  r.ellipse(10, 5, 9.5, 4.5, purple.base).rect(1, 5, 19, 9, purple.base);
  light(r, purple);
  r.rect(1, 7, 19, 1, purple.line);
  r.rect(4, 1, 2, 13, yellow.base).rect(15, 1, 2, 13, yellow.base).rect(1, 12, 19, 2, yellow.base);
  r.rect(7, 5, 7, 5, yellow.base);
  light(r, yellow);
  r.ellipse(10, 7, 2, 2, teal.base);
  light(r, teal);
  r.set(9, 6, "w").set(10, 9, yellow.line);
  return tinted(r);
}

export type ChestKind = "elite" | "boss";

export const CHEST_SPRITES: Readonly<Record<ChestKind, Sprite>> = {
  elite: CHEST,
  boss: bossChest(),
};

export function chestKind(prizes: number): ChestKind {
  return prizes > 1 ? "boss" : "elite";
}
