import { describe, expect, it } from "vitest";
import * as sprites from "./arena-sprites";
import { PALETTE, TRANSPARENT } from "./palette";

const grids = Object.entries(sprites).filter((entry): entry is [string, readonly string[]] => Array.isArray(entry[1]) && typeof entry[1][0] === "string");

describe("arena sprites", () => {
  it.each(grids)("%s is a rectangle of palette keys", (_, grid) => {
    const width = grid[0]?.length ?? 0;
    expect(width).toBeGreaterThan(0);
    for (const row of grid) {
      expect(row).toHaveLength(width);
      for (const key of row) {
        expect(key === TRANSPARENT || key === sprites.FACTION_KEY || key in PALETTE).toBe(true);
      }
    }
  });
});
