import { describe, expect, it } from "vitest";
import { REGULAR_KINDS } from "../sim/arena/content";
import { DEATH_FRAMES, deathFrames, HURT_FRAMES, HURT_TINT, hurtFrames, legRowCount, WALK_FRAMES, walkFrames } from "./animate";
import { ENEMY_SPRITES } from "./arena-sprites";
import { averageLuminance, rgbOf } from "./audit";
import { enemyClips } from "./clips";
import { shade, type ColorGrid } from "./shade";
import { WORLD_LOOKS } from "./world-looks";

const FACTION = WORLD_LOOKS[1].faction;

function colors(grid: ColorGrid): string[] {
  return grid.flat().filter((color): color is string => color !== null);
}

function distanceToTint(grid: ColorGrid): number {
  const tint = rgbOf(HURT_TINT);
  const all = colors(grid).map(rgbOf);
  return all.reduce((sum, { r, g, b }) => sum + Math.hypot(r - tint.r, g - tint.g, b - tint.b), 0) / Math.max(1, all.length);
}

describe("walk cycle", () => {
  it.each(REGULAR_KINDS)("%s walks in four frames of one size that actually move", (kind) => {
    const frames = walkFrames(ENEMY_SPRITES[kind]);
    expect(frames).toHaveLength(WALK_FRAMES);
    const width = frames[0]?.[0]?.length;
    for (const frame of frames) {
      expect(frame).toHaveLength(ENEMY_SPRITES[kind].length + 1);
      for (const row of frame) {
        expect(row).toHaveLength(width ?? 0);
      }
    }
    expect(new Set(frames.map((frame) => frame.join("/"))).size).toBeGreaterThanOrEqual(2);
  });

  it("swings the feet of enemies with two legs in opposite directions", () => {
    const sprite = ENEMY_SPRITES.grunt;
    expect(legRowCount(sprite)).toBeGreaterThan(0);
    const [contact, , other] = walkFrames(sprite);
    expect(contact?.at(-1)).not.toEqual(other?.at(-1));
  });

  it("keeps every pixel of the body in each frame", () => {
    for (const kind of REGULAR_KINDS) {
      const filled = ENEMY_SPRITES[kind].join("").replaceAll(".", "").length;
      for (const frame of walkFrames(ENEMY_SPRITES[kind])) {
        expect(frame.join("").replaceAll(".", "").length).toBeGreaterThanOrEqual(filled);
      }
    }
  });
});

describe("hurt frames", () => {
  it("uses a light, cool tint", () => {
    const { r, b } = rgbOf(HURT_TINT);
    expect(b).toBeGreaterThan(r);
    expect(averageLuminance([HURT_TINT])).toBeGreaterThan(0.7);
    expect(HURT_TINT).not.toBe("#ffffff");
  });

  it.each(REGULAR_KINDS)("%s turns lighter and cooler when hit, not pure white", (kind) => {
    const base = shade([ENEMY_SPRITES[kind]], FACTION);
    const hurt = hurtFrames(base);
    expect(hurt).toHaveLength(HURT_FRAMES);
    for (const frame of hurt) {
      expect(averageLuminance(colors(frame))).toBeGreaterThan(averageLuminance(colors(base)));
      expect(distanceToTint(frame)).toBeLessThan(distanceToTint(base));
      expect(colors(frame).filter((color) => color === "#ffffff").length / colors(frame).length).toBeLessThan(0.05);
    }
    expect(averageLuminance(colors(hurt[0] ?? []))).toBeGreaterThan(averageLuminance(colors(hurt[1] ?? [])));
  });
});

describe("death puff", () => {
  it.each(REGULAR_KINDS)("%s bursts into its own material over five frames", (kind) => {
    const base = shade([ENEMY_SPRITES[kind]], FACTION);
    const { frames } = deathFrames(base);
    expect(frames).toHaveLength(DEATH_FRAMES);
    const own = new Set(colors(base));
    const debris = colors(frames[2] ?? []).filter((color) => own.has(color));
    expect(new Set(debris).size).toBeGreaterThanOrEqual(3);
    expect(colors(frames.at(-1) ?? []).length).toBeLessThan(colors(frames[1] ?? []).length);
    expect(colors(frames.at(-1) ?? []).length).toBeGreaterThan(0);
  });

  it("draws every death frame at one size", () => {
    const { frames } = deathFrames(shade([ENEMY_SPRITES.heavy], FACTION));
    const height = frames[0]?.length;
    const width = frames[0]?.[0]?.length;
    for (const frame of frames) {
      expect(frame).toHaveLength(height ?? 0);
      expect(frame[0]).toHaveLength(width ?? 0);
    }
  });
});

describe("enemy clips", () => {
  it.each(REGULAR_KINDS)("%s packs walk then hurt frames, for regular and elite", (kind) => {
    for (const elite of [false, true]) {
      const clips = enemyClips(kind, FACTION, elite);
      expect(clips.moving).toHaveLength(WALK_FRAMES + HURT_FRAMES);
      expect(clips.death.frames).toHaveLength(DEATH_FRAMES);
    }
  });
});
