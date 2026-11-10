import { describe, expect, it } from "vitest";
import { agentBody } from "./agent";
import { span } from "./audit";
import { shade } from "./shade";
import { WEAPON_STAGES, weaponSprite, weaponStage } from "./weapon-art";

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

  it.each(["prompt", "webSearch", "codeExec", "subagents"] as const)("%s looks bigger at each stage", (weapon) => {
    const sizes = WEAPON_STAGES.map((stage) => measure(weaponSprite(weapon, stage)));
    expect(sizes[1]).toBeGreaterThan(sizes[0] ?? 0);
    expect(sizes[2]).toBeGreaterThan(sizes[1] ?? 0);
  });

  it.each([
    ["webSearch", "ragSearch"],
    ["codeExec", "codeInterpreter"],
  ] as const)("%s evolves into %s, bigger than its max stage", (base, evolved) => {
    expect(weaponSprite(evolved, 0).join("/")).not.toBe(weaponSprite(base, 2).join("/"));
    expect(measure(weaponSprite(evolved, 0))).toBeGreaterThanOrEqual(measure(weaponSprite(base, 2)));
  });
});
