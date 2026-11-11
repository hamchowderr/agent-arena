import { describe, expect, it } from "vitest";
import { BEAM, BIG_GEM, BOLT, CODE_BLOCK, GEM, RAG_BEAM, SEEKER } from "./arena-sprites";
import { MIN_GROUND_CONTRAST } from "./art-rules";
import { BRICK, CURSOR, RAG_DART, weaponSprite } from "./weapon-art";
import { dominantHue, groundContrast, hueGap, span } from "./audit";
import { shade } from "./shade";
import { WORLD_LOOKS } from "./world-looks";

const PLAYER_SHOTS = { BOLT, BEAM, RAG_BEAM, SEEKER, CODE_BLOCK, BRICK, CURSOR, RAG_DART } as const;
const TOKENS = { GEM, BIG_GEM } as const;
const GOLD_HUE = 40;
const GROUNDS = Object.values(WORLD_LOOKS).map((look) => look.ground[0]);

describe("weapon and pickup art", () => {
  it.each(Object.entries(PLAYER_SHOTS))("%s is big enough to read in a crowd", (_, sprite) => {
    expect(span(shade([sprite], "#000000"))).toBeGreaterThanOrEqual(9);
  });

  it("draws web search as homing darts, bigger for the evolved version", () => {
    const dart = span(shade([weaponSprite("webSearch", 0)], "#000000"));
    expect(dart).toBeGreaterThanOrEqual(16);
    expect(dart).toBeLessThan(span(shade([BEAM], "#000000")));
    expect(span(shade([RAG_DART], "#000000"))).toBeGreaterThan(dart);
  });

  it("sizes XP tokens like pickups, with the big token larger", () => {
    expect(span(shade([GEM], "#000000"))).toBe(9);
    expect(span(shade([BIG_GEM], "#000000"))).toBeGreaterThan(9);
  });

  it.each(Object.entries(TOKENS))("%s reads as a gold token", (_, sprite) => {
    expect(hueGap(dominantHue(shade([sprite], "#000000")), GOLD_HUE)).toBeLessThan(15);
  });

  it.each(Object.entries({ ...PLAYER_SHOTS, ...TOKENS }))("%s stands out on every world's ground", (_, sprite) => {
    for (const ground of GROUNDS) {
      expect(groundContrast(shade([sprite], "#000000"), ground)).toBeGreaterThanOrEqual(MIN_GROUND_CONTRAST);
    }
  });
});
