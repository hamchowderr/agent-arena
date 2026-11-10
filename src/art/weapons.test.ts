import { describe, expect, it } from "vitest";
import { BEAM, BIG_GEM, BOLT, CODE_BLOCK, GEM, RAG_BEAM, SEEKER } from "./arena-sprites";
import { MIN_GROUND_CONTRAST } from "./art-rules";
import { groundContrast, span } from "./audit";
import { shade } from "./shade";
import { WORLD_LOOKS } from "./world-looks";

const PLAYER_SHOTS = { BOLT, BEAM, RAG_BEAM, SEEKER, CODE_BLOCK } as const;
const TOKENS = { GEM, BIG_GEM } as const;
const GROUNDS = Object.values(WORLD_LOOKS).map((look) => look.ground[0]);

describe("weapon and pickup art", () => {
  it.each(Object.entries(PLAYER_SHOTS))("%s is big enough to read in a crowd", (_, sprite) => {
    expect(span(shade([sprite], "#000000"))).toBeGreaterThanOrEqual(9);
  });

  it("draws web search as a long beam, longer for the evolved version", () => {
    expect(span(shade([BEAM], "#000000"))).toBeGreaterThanOrEqual(36);
    expect(span(shade([RAG_BEAM], "#000000"))).toBeGreaterThan(span(shade([BEAM], "#000000")));
  });

  it("sizes XP tokens like pickups, with the big token larger", () => {
    expect(span(shade([GEM], "#000000"))).toBe(9);
    expect(span(shade([BIG_GEM], "#000000"))).toBeGreaterThan(9);
  });

  it.each(Object.entries({ ...PLAYER_SHOTS, ...TOKENS }))("%s stands out on every world's ground", (_, sprite) => {
    for (const ground of GROUNDS) {
      expect(groundContrast(shade([sprite], "#000000"), ground)).toBeGreaterThanOrEqual(MIN_GROUND_CONTRAST);
    }
  });
});
