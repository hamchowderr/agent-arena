import { describe, expect, it } from "vitest";
import { MIN_GROUND_CONTRAST } from "./art-rules";
import { groundContrast, span } from "./audit";
import { shade } from "./shade";
import { CODE_MISSILE, CODER_DRONE, DURABLE_MINE, DURABLE_MINE_HOT, MINE, MINE_HOT, NETWORK_MISSILE, TEAM_MISSILE } from "./tool-art";
import { WORLD_LOOKS } from "./world-looks";

const GROUNDS = Object.values(WORLD_LOOKS).map((look) => look.ground[0]);
const SHOTS = { CODE_MISSILE, NETWORK_MISSILE, TEAM_MISSILE, CODER_DRONE } as const;
const MINES = { MINE, MINE_HOT, DURABLE_MINE, DURABLE_MINE_HOT } as const;
const measure = (sprite: readonly string[]) => span(shade([sprite], "#000000"));

describe("new tool art", () => {
  it.each(Object.entries({ ...SHOTS, ...MINES }))("%s is big enough to read in a crowd and stands out on every ground", (_, sprite) => {
    expect(measure(sprite)).toBeGreaterThanOrEqual(9);
    for (const ground of GROUNDS) {
      expect(groundContrast(shade([sprite], "#000000"), ground)).toBeGreaterThanOrEqual(MIN_GROUND_CONTRAST);
    }
  });

  it("grows the coder missile as it merges and evolves", () => {
    expect(measure(NETWORK_MISSILE)).toBeGreaterThan(measure(CODE_MISSILE));
    expect(measure(TEAM_MISSILE)).toBeGreaterThan(measure(NETWORK_MISSILE));
  });

  it("gives each mine a hot frame that looks different, so the player sees which one blows next", () => {
    expect(MINE_HOT.join("/")).not.toBe(MINE.join("/"));
    expect(DURABLE_MINE_HOT.join("/")).not.toBe(DURABLE_MINE.join("/"));
    expect(DURABLE_MINE.join("/")).not.toBe(MINE.join("/"));
  });
});
