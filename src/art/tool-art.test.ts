import { describe, expect, it } from "vitest";
import { MIN_GROUND_CONTRAST } from "./art-rules";
import { dominantHue, groundContrast, hueGap, span } from "./audit";
import { shade } from "./shade";
import { BOLT_PROFILES, CODER_DRONE } from "./tool-art";
import { shotFrames } from "./weapon-art";
import { WORLD_LOOKS } from "./world-looks";

const GROUNDS = Object.values(WORLD_LOOKS).map((look) => look.ground[0]);
const CYAN_HUE = 190;

describe("tool art", () => {
  it("draws the coder drone big enough to read and lifts it off every ground", () => {
    expect(span(shade([CODER_DRONE], "#000000"))).toBeGreaterThanOrEqual(9);
    for (const ground of GROUNDS) {
      expect(groundContrast(shade([CODER_DRONE], "#000000"), ground)).toBeGreaterThanOrEqual(MIN_GROUND_CONTRAST);
    }
  });

  it("gives each clock a ringing frame that looks different, so the player sees which one blows next", () => {
    for (const weapon of ["scheduledJob", "durableWorkflow"] as const) {
      const [calm, ringing] = shotFrames(weapon, 0);
      expect(ringing?.join("/")).not.toBe(calm?.join("/"));
    }
  });

  it("keeps both API call bands in the cyan of their hit spark", () => {
    for (const profile of Object.values(BOLT_PROFILES)) {
      const row = profile.join("");
      expect(hueGap(dominantHue(shade([[row, row, row]], "#000000")), CYAN_HUE)).toBeLessThan(30);
    }
  });
});
