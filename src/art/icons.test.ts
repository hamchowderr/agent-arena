import { describe, expect, it } from "vitest";
import { PASSIVES, WEAPONS } from "../sim/arena/content";
import { PASSIVE_ICONS, WEAPON_ICONS } from "./icons";
import { PALETTE, TRANSPARENT } from "./palette";

const icons = [...Object.entries(WEAPON_ICONS), ...Object.entries(PASSIVE_ICONS)];

describe("card icons", () => {
  it("has an icon for every weapon and passive", () => {
    expect(Object.keys(WEAPON_ICONS).sort()).toEqual(Object.keys(WEAPONS).sort());
    expect(Object.keys(PASSIVE_ICONS).sort()).toEqual(Object.keys(PASSIVES).sort());
  });

  it.each(icons)("%s is a rectangle of palette keys no bigger than 17 pixels", (_, icon) => {
    const width = icon[0]?.length ?? 0;
    expect(width).toBeGreaterThan(8);
    expect(width).toBeLessThanOrEqual(17);
    expect(icon.length).toBeLessThanOrEqual(17);
    for (const row of icon) {
      expect(row).toHaveLength(width);
      for (const key of row) {
        expect(key === TRANSPARENT || key in PALETTE).toBe(true);
      }
    }
  });

  it("gives every icon its own picture", () => {
    const pictures = icons.map(([, icon]) => icon.join("/"));
    expect(new Set(pictures).size).toBe(pictures.length);
  });
});
