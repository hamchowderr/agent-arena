import { describe, expect, it } from "vitest";
import { MARK_SIZES, markFrameIndex, markFrames, SPARK_BY_WEAPON, SPARK_FRAMES, SPARK_STYLES, sparkFrameIndex, sparkFrames } from "./impacts";
import { WORLD_LOOKS } from "./world-looks";
import type { ColorGrid } from "./shade";

function filled(grid: ColorGrid): number {
  return grid.flat().filter((color) => color !== null).length;
}

function brightness(color: string): number {
  return [1, 3, 5].reduce((sum, index) => sum + Number.parseInt(color.slice(index, index + 2), 16), 0);
}

describe("hit sparks", () => {
  const frames = sparkFrames();

  it("has every frame of every style at one size", () => {
    expect(frames).toHaveLength(SPARK_STYLES.length * SPARK_FRAMES);
    expect(new Set(frames.map((frame) => frame.length))).toEqual(new Set([frames[0]?.length]));
    expect(frames.every((frame) => filled(frame) > 0)).toBe(true);
  });

  it.each(SPARK_STYLES)("%s bursts out from its first frame", (style) => {
    expect(filled(frames[sparkFrameIndex(style, 1)] ?? [])).toBeGreaterThan(filled(frames[sparkFrameIndex(style, 0)] ?? []));
  });

  it("gives every style its own burst and its own colors", () => {
    const bursts = SPARK_STYLES.map((style) => JSON.stringify(frames[sparkFrameIndex(style, 1)]));
    expect(new Set(bursts).size).toBe(SPARK_STYLES.length);
    const palettes = SPARK_STYLES.map((style) => [...new Set(frames[sparkFrameIndex(style, 1)]?.flat().filter((color) => color !== null))].sort().join());
    expect(new Set(palettes).size).toBe(SPARK_STYLES.length);
  });

  it("uses every style for some weapon", () => {
    expect(new Set(Object.values(SPARK_BY_WEAPON))).toEqual(new Set(SPARK_STYLES));
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
