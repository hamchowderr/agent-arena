import { describe, expect, it } from "vitest";
import { runBattle } from "./battle";
import { assertValidLoadout, buildAgent, HEALTH_PER_TIER, LoadoutError, RAW_LLM_BASE, UNROUTED_TOOL_HALLUCINATION, type Loadout } from "./loadout";
import { PARTS } from "./parts";
import { SLOT_CAPACITY, TIERS, unlockedSlots, type SlotId } from "./tiers";

const harnessed: Loadout<5> = {
  name: "Harnessed",
  tier: 5,
  parts: [
    "frontierBrain",
    "strictPrompt",
    "fewShotExamples",
    "webSearch",
    "codeExec",
    "toolRouter",
    "planner",
    "selfCheck",
    "guardrails",
    "sandbox",
    "verifier",
  ],
};

describe("tiers", () => {
  it("unlocks every slot exactly once across tiers 1 to 5", () => {
    const slots = TIERS.flatMap((entry) => entry.slots);
    expect(new Set(slots).size).toBe(slots.length);
    expect(new Set(slots)).toEqual(new Set(Object.keys(SLOT_CAPACITY)));
    expect(TIERS.map((entry) => entry.tier)).toEqual([1, 2, 3, 4, 5]);
  });

  it("only adds slots as the tier rises", () => {
    for (const entry of TIERS.slice(1)) {
      const below = unlockedSlots((entry.tier - 1) as 1 | 2 | 3 | 4);
      expect(unlockedSlots(entry.tier)).toEqual([...below, ...entry.slots]);
    }
  });

  it("gives every slot at least one part", () => {
    const filled = new Set<SlotId>(Object.values(PARTS).map((part) => part.slot));
    expect(filled).toEqual(new Set(Object.keys(SLOT_CAPACITY)));
  });
});

describe("buildAgent", () => {
  it("turns an empty tier 1 loadout into the raw LLM base stats", () => {
    expect(buildAgent({ name: "Bare", tier: 1, parts: [] })).toEqual({ name: "Bare", ...RAW_LLM_BASE });
  });

  it("adds health for each funding stage", () => {
    expect(buildAgent({ name: "IPO", tier: 5, parts: [] }).maxHealth).toBe(RAW_LLM_BASE.maxHealth + 4 * HEALTH_PER_TIER);
  });

  it("applies part effects as integers", () => {
    const build = buildAgent({ name: "Prompted", tier: 1, parts: ["midBrain", "strictPrompt"] });
    expect(build.attack).toBe(RAW_LLM_BASE.attack + 2);
    expect(build.hallucinationPercent).toBe(RAW_LLM_BASE.hallucinationPercent - 8);
  });

  it("makes tools hallucinate more without a router", () => {
    const unrouted = buildAgent({ name: "Unrouted", tier: 3, parts: ["codeExec", "calculator"] });
    const routed = buildAgent({ name: "Routed", tier: 3, parts: ["codeExec", "calculator", "toolRouter"] });
    expect(unrouted.hallucinationPercent - routed.hallucinationPercent).toBe(2 * UNROUTED_TOOL_HALLUCINATION);
  });

  it("keeps derived stats inside the ranges the battle engine accepts", () => {
    const build = buildAgent(harnessed);
    expect(build.hallucinationPercent).toBe(0);
    expect(build.critPercent).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(build.ticksPerAction)).toBe(true);
    expect(() => runBattle(1, build, build)).not.toThrow();
  });

  it("lets a harnessed agent beat a raw LLM on most seeds", () => {
    const raw = buildAgent({ name: "Raw", tier: 1, parts: ["midBrain"] });
    const agent = buildAgent(harnessed);
    let wins = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      if (runBattle(seed, agent, raw).winner === 0) {
        wins += 1;
      }
    }
    expect(wins).toBeGreaterThanOrEqual(90);
  });

  it("gives the same fight for the same seed and loadouts", () => {
    const left = buildAgent(harnessed);
    const right = buildAgent({ name: "Chatbot", tier: 2, parts: ["hotTemperature", "conversationBuffer"] });
    for (let seed = 0; seed < 50; seed += 1) {
      expect(runBattle(seed, left, right)).toEqual(runBattle(seed, left, right));
    }
  });
});

describe("assertValidLoadout", () => {
  it("rejects a part whose slot the tier has not unlocked", () => {
    expect(() => assertValidLoadout({ name: "Early", tier: 2, parts: ["guardrails"] })).toThrow(LoadoutError);
    expect(() => assertValidLoadout({ name: "Early", tier: 2, parts: ["guardrails"] })).toThrow(/needs tier 5/);
  });

  it("rejects more parts than a slot holds", () => {
    expect(() => assertValidLoadout({ name: "Two brains", tier: 1, parts: ["midBrain", "tinyBrain"] })).toThrow(LoadoutError);
    expect(() =>
      assertValidLoadout({ name: "Toolbox", tier: 3, parts: ["webSearch", "codeExec", "calculator", "fileReader", "webSearch"] }),
    ).toThrow(/tool holds 4/);
  });

  it("rejects unknown parts and tiers from saved ghost builds", () => {
    expect(() => assertValidLoadout({ name: "Ghost", tier: 3, parts: ["laserBeam"] })).toThrow(/unknown part/);
    expect(() => assertValidLoadout({ name: "Ghost", tier: 6, parts: [] })).toThrow(/tier must be 1 to 5/);
  });

  it("is enforced by the type system for literal loadouts", () => {
    // @ts-expect-error guardrails need tier 5
    const tooEarly: Loadout<2> = { name: "Early", tier: 2, parts: ["guardrails"] };
    expect(tooEarly.tier).toBe(2);
  });
});
