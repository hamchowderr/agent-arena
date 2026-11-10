import { beforeAll, describe, expect, it } from "vitest";
import { TIERS } from "../sim/tiers";
import { layersFor, SCORE_LAYERS, scoreFor } from "./score";

describe("score", () => {
  it("has one layer per agent tier, in order", () => {
    expect(SCORE_LAYERS.map((layer) => layer.tier)).toEqual(TIERS.map((entry) => entry.tier));
  });

  it("adds one layer each time the agent tiers up", () => {
    for (const { tier } of TIERS) {
      expect(layersFor(tier)).toHaveLength(tier);
    }
  });
});

describe("score in Strudel", () => {
  let core: typeof import("@strudel/core");
  let transpiler: unknown;
  const evaluate = (code: string) => core.evaluate(code, transpiler);

  beforeAll(async () => {
    core = await import("@strudel/core");
    await core.evalScope(core, await import("@strudel/mini"));
    ({ transpiler } = await import("@strudel/transpiler"));
  });

  it.each(SCORE_LAYERS)("layer $tier ($name) parses and makes sound every cycle", async (layer) => {
    const { pattern } = await evaluate(layer.code);
    for (let cycle = 0; cycle < 4; cycle += 1) {
      expect(pattern.queryArc(cycle, cycle + 1).length).toBeGreaterThan(0);
    }
  });

  it.each(TIERS)("the full score for tier $tier ($name) plays", async ({ tier }) => {
    const { pattern } = await evaluate(scoreFor(tier));
    expect(pattern.queryArc(0, 1).length).toBeGreaterThan(0);
  });

  it("plays the kick four times a cycle, so the test reads mini-notation", async () => {
    const kick = SCORE_LAYERS.find((layer) => layer.name === "Kick");
    const { pattern } = await evaluate(kick?.code ?? "");
    expect(pattern.queryArc(0, 1)).toHaveLength(4);
  });

  it("catches broken mini-notation", async () => {
    await expect(evaluate('note("c2 ]] <").s("sine")')).rejects.toThrow();
  });
});
