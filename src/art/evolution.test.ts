import { describe, expect, it } from "vitest";
import { agentBody } from "./agent";
import { span } from "./audit";
import { shade } from "./shade";
import { weaponStage } from "./weapon-art";

const TIERS = [1, 2, 3, 4, 5] as const;
const measure = (sprite: readonly string[]) => span(shade([sprite], "#000000"));

describe("evolution stages", () => {
  it("grows the agent at every tier and gives each tier its own drawing", () => {
    const bodies = TIERS.map((tier) => agentBody(tier));
    for (let index = 1; index < bodies.length; index += 1) {
      expect(measure(bodies[index] ?? [])).toBeGreaterThan(measure(bodies[index - 1] ?? []));
    }
    expect(new Set(bodies.map((body) => body.join("/"))).size).toBe(TIERS.length);
  });

  it("maps levels 1-2, 3-4 and 5 to three looks", () => {
    expect([1, 2, 3, 4, 5].map(weaponStage)).toEqual([0, 0, 1, 1, 2]);
  });
});
