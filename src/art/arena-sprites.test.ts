import { describe, expect, it } from "vitest";
import * as sprites from "./arena-sprites";
import { isMaterial } from "./materials";
import { PALETTE, TRANSPARENT } from "./palette";
import { FACTION_DARK_KEY, FACTION_LIGHT_KEY } from "./shade";

const grids = Object.entries(sprites).filter((entry): entry is [string, readonly string[]] => Array.isArray(entry[1]) && typeof entry[1][0] === "string");

describe("arena sprites", () => {
  it.each(grids)("%s is a rectangle of palette keys", (_, grid) => {
    const width = grid[0]?.length ?? 0;
    expect(width).toBeGreaterThan(0);
    for (const row of grid) {
      expect(row).toHaveLength(width);
      for (const key of row) {
        expect(key === TRANSPARENT || key === sprites.FACTION_KEY || key === FACTION_LIGHT_KEY || key === FACTION_DARK_KEY || key in PALETTE || isMaterial(key)).toBe(true);
      }
    }
  });
});

describe("outlined", () => {
  it("rings every filled pixel with the outline key and keeps the inside", () => {
    expect(sprites.outlined(["k"], "w")).toEqual([".w.", "wkw", ".w."]);
  });

  it("makes a sprite two pixels wider and taller", () => {
    const outline = sprites.outlined(sprites.GRUNT, "w");
    expect(outline).toHaveLength(sprites.GRUNT.length + 2);
    expect(outline[0]).toHaveLength((sprites.GRUNT[0]?.length ?? 0) + 2);
  });

  it("crowns elites with a gold outline", () => {
    const elite = sprites.eliteSprite(sprites.GRUNT);
    expect(elite.join("")).toContain("y");
    expect(elite[0]).toContain("y");
  });
});
