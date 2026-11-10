import { describe, expect, it } from "vitest";
import { PALETTE, TRANSPARENT } from "./palette";
import { AGENT_LAYERS, agentSprite, CROWN, RIVAL, rivalSprite, SPRITE_SIZE, type Sprite } from "./sprites";

const ALL: Record<string, Sprite> = {
  ...Object.fromEntries(Object.entries(AGENT_LAYERS).map(([tier, sprite]) => [`agent tier ${tier}`, sprite])),
  rival: RIVAL,
  crown: CROWN,
};

describe("sprites", () => {
  it.each(Object.entries(ALL))("%s is a 16 by 16 grid", (_, sprite) => {
    expect(sprite).toHaveLength(SPRITE_SIZE);
    for (const row of sprite) {
      expect(row).toHaveLength(SPRITE_SIZE);
    }
  });

  it.each(Object.entries(ALL))("%s only uses colors from the shared palette", (_, sprite) => {
    const allowed = new Set([TRANSPARENT, ...Object.keys(PALETTE)]);
    for (const row of sprite) {
      for (const key of row) {
        expect(allowed.has(key)).toBe(true);
      }
    }
  });

  it("grows the agent one layer per tier", () => {
    for (const tier of [1, 2, 3, 4, 5] as const) {
      expect(agentSprite(tier)).toHaveLength(tier);
    }
  });

  it("puts a crown on bosses only", () => {
    expect(rivalSprite(true)).toContain(CROWN);
    expect(rivalSprite(false)).not.toContain(CROWN);
  });
});
