import { describe, expect, it } from "vitest";
import { PALETTE } from "./palette";
import { rampOf, shade } from "./shade";

const lightness = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return ((value >> 16) & 255) + ((value >> 8) & 255) + (value & 255);
};

describe("shading", () => {
  it("builds a ramp that runs from light to line", () => {
    for (const base of ["#e8603c", "#a77ee0", "#e9a93a", "#2fb5ad", "#e562c0"]) {
      const ramp = rampOf(base);
      expect(lightness(ramp.light)).toBeGreaterThan(lightness(ramp.base));
      expect(lightness(ramp.base)).toBeGreaterThan(lightness(ramp.dark));
      expect(lightness(ramp.dark)).toBeGreaterThan(lightness(ramp.line));
    }
  });

  it("lights the top of a body, darkens the bottom, and tints only its outer outline", () => {
    const ramp = rampOf("#2fb5ad");
    const grid = shade([[".kkk.", "kXXXk", "kXXXk", "kXXXk", "kXwXk", ".kkk."]], "#2fb5ad");
    expect(grid[0]?.[0]).toBeNull();
    expect(grid[1]?.[2]).toBe(ramp.light);
    expect(grid[3]?.[2]).toBe(ramp.dark);
    expect(grid[0]?.[2]).toBe(ramp.line);
    expect(grid[4]?.[2]).toBe(PALETTE.w);
  });

  it("leaves outlines alone on sprites without a faction body", () => {
    const grid = shade([["kkk", "kmk", "kkk"]], "#2fb5ad");
    expect(grid[0]?.[0]).toBe(PALETTE.k);
  });
});
