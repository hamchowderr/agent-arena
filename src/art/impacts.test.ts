import { describe, expect, it } from "vitest";
import { MARK_SIZES, markFrameIndex, markFrames, SPARK_FRAMES, sparkFrames } from "./impacts";
import { WORLD_LOOKS } from "./world-looks";
import type { ColorGrid } from "./shade";

function filled(grid: ColorGrid): number {
  return grid.flat().filter((color) => color !== null).length;
}

function brightness(color: string): number {
  return [1, 3, 5].reduce((sum, index) => sum + Number.parseInt(color.slice(index, index + 2), 16), 0);
}

describe("hit sparks", () => {
  it("burst out and then fade to embers", () => {
    const frames = sparkFrames();
    expect(frames).toHaveLength(SPARK_FRAMES);
    expect(new Set(frames.map((frame) => frame.length))).toEqual(new Set([frames[0]?.length]));
    expect(frames.every((frame) => filled(frame) > 0)).toBe(true);
    expect(filled(frames[1] ?? [])).toBeGreaterThan(filled(frames[0] ?? []));
  });
});

describe("ground marks", () => {
  it.each(Object.entries(WORLD_LOOKS))("tier %s marks grow with size, fade by dithering and stain darker than the ground", (_, look) => {
    const frames = markFrames(look.ground[0]);
    expect(frames).toHaveLength(MARK_SIZES.length * 2);
    const sizes = MARK_SIZES.map((size) => filled(frames[markFrameIndex(size, false)] ?? []));
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
    for (const size of MARK_SIZES) {
      const solid = filled(frames[markFrameIndex(size, false)] ?? []);
      expect(filled(frames[markFrameIndex(size, true)] ?? [])).toBeLessThan(solid * 0.6);
    }
    const center = frames[markFrameIndex("medium", false)]?.[15]?.[15] ?? "#ffffff";
    expect(brightness(center)).toBeLessThan(brightness(look.ground[0]));
  });
});
