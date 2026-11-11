import { describe, expect, it } from "vitest";
import { BOSS_CHEST_PRIZES, ELITE_CHEST_PRIZES } from "../sim/arena/sim";
import { ENEMIES } from "../sim/arena/content";
import { CHEST_SPRITES, chestKind, TOKEN_SPRITES, TOKEN_TIERS, tokenTier } from "./loot";
import type { Sprite } from "./sprites";

function filled(sprite: Sprite): number {
  return sprite.join("").replaceAll(".", "").length;
}

describe("XP tokens", () => {
  it("grow with each tier", () => {
    const sizes = TOKEN_TIERS.map((tier) => filled(TOKEN_SPRITES[tier]));
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
    expect(new Set(sizes).size).toBe(TOKEN_TIERS.length);
  });

  it("never shrink as the value grows, and reach every tier", () => {
    const tiers = Array.from({ length: 200 }, (_, index) => tokenTier(index + 1));
    expect([...tiers].sort((a, b) => a - b)).toEqual(tiers);
    expect(new Set(tiers)).toEqual(new Set(TOKEN_TIERS));
  });

  it("shows a regular kill as the smallest token and a boss as the biggest", () => {
    expect(tokenTier(ENEMIES.grunt.xp)).toBe(0);
    expect(tokenTier(ENEMIES.boss.xp)).toBe(3);
  });
});

describe("chests", () => {
  it("gives the boss chest its own, bigger look", () => {
    expect(chestKind(ELITE_CHEST_PRIZES)).toBe("elite");
    expect(chestKind(BOSS_CHEST_PRIZES)).toBe("boss");
    expect(filled(CHEST_SPRITES.boss)).toBeGreaterThan(filled(CHEST_SPRITES.elite));
  });
});
