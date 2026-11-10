import { describe, expect, it } from "vitest";
import { WORLDS, type RegularKind } from "../sim/arena/content";
import { walkFrames, WALK_FRAMES } from "./animate";
import { ENEMY_SPRITES } from "./arena-sprites";
import { ENEMY_ART_TIER, MAX_SILHOUETTE_OVERLAP, MAX_SPRITE_COLORS, MIN_ENEMY_COLORS, MIN_GROUND_CONTRAST, TIER_SPAN } from "./art-rules";
import { colorCount, groundContrast, silhouetteOverlap, span } from "./audit";
import { shade } from "./shade";
import { enemyPoses, enemySprite, wallSprite } from "./world-enemies";
import { WORLD_LOOKS } from "./world-looks";

const CASES = WORLDS.flatMap((world) =>
  [...new Set<RegularKind>([...world.slots, "lootRunner"])].map((kind) => [world.id, kind] as const),
);

describe("world enemies", () => {
  it.each(CASES.filter(([world]) => world !== "hustlr"))("%s draws its own %s instead of reusing the office set", (world, kind) => {
    expect(enemySprite(world, kind)).not.toBe(ENEMY_SPRITES[kind]);
  });

  it.each(CASES)("%s %s is a rectangle that walks in four frames", (world, kind) => {
    const sprite = enemySprite(world, kind);
    expect(new Set(sprite.map((row) => row.length)).size).toBe(1);
    const frames = walkFrames(sprite);
    expect(frames).toHaveLength(WALK_FRAMES);
    expect(new Set(frames.map((frame) => frame.join("/"))).size).toBeGreaterThanOrEqual(2);
  });

  it.each(CASES.filter(([world]) => world === "hustlr"))("%s %s is a hand-posed character whose every frame passes the art rules", (world, kind) => {
    const frames = enemyPoses(world, kind) ?? [];
    expect(frames).toHaveLength(WALK_FRAMES);
    expect(new Set(frames.map((frame) => frame.join("/"))).size).toBeGreaterThanOrEqual(2);
    const look = WORLD_LOOKS[1];
    const range = TIER_SPAN[ENEMY_ART_TIER[kind]];
    for (const frame of frames) {
      expect(new Set(frame.map((row) => row.length)).size).toBe(1);
      const grid = shade([frame], look.faction);
      expect(span(grid)).toBeGreaterThanOrEqual(range.min);
      expect(span(grid)).toBeLessThanOrEqual(range.max);
      expect(colorCount(grid)).toBeLessThanOrEqual(MAX_SPRITE_COLORS);
      expect(groundContrast(grid, look.ground[0])).toBeGreaterThanOrEqual(MIN_GROUND_CONTRAST);
    }
  });

  it("gives every world a different set of faces", () => {
    const sets = WORLDS.map((world) => world.slots.map((kind) => enemySprite(world.id, kind).join("/")).join("|"));
    expect(new Set(sets).size).toBe(WORLDS.length);
  });
});

describe("wall sprites", () => {
  it.each(WORLDS.map((world) => [world.id, world] as const))("%s has a wall that stands out and doesn't look like its heavy", (id, world) => {
    const look = WORLD_LOOKS[world.tier];
    const wall = shade([wallSprite(id)], look.faction);
    const range = TIER_SPAN.heavy;
    expect(span(wall)).toBeGreaterThanOrEqual(range.min);
    expect(span(wall)).toBeLessThanOrEqual(range.max);
    expect(colorCount(wall)).toBeGreaterThanOrEqual(MIN_ENEMY_COLORS);
    expect(colorCount(wall)).toBeLessThanOrEqual(MAX_SPRITE_COLORS);
    expect(groundContrast(wall, look.ground[0])).toBeGreaterThanOrEqual(MIN_GROUND_CONTRAST);
    expect(silhouetteOverlap(wall, shade([enemySprite(id, "heavy")], look.faction))).toBeLessThan(MAX_SILHOUETTE_OVERLAP);
  });

  it("draws a different wall for every world", () => {
    expect(new Set(WORLDS.map((world) => wallSprite(world.id).join("/"))).size).toBe(WORLDS.length);
  });
});
