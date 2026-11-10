import { describe, expect, it } from "vitest";
import { WORLDS, type RegularKind } from "../sim/arena/content";
import { walkFrames, WALK_FRAMES } from "./animate";
import { ENEMY_SPRITES } from "./arena-sprites";
import { enemySprite } from "./world-enemies";

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

  it("gives every world a different set of faces", () => {
    const sets = WORLDS.map((world) => world.slots.map((kind) => enemySprite(world.id, kind).join("/")).join("|"));
    expect(new Set(sets).size).toBe(WORLDS.length);
  });
});
