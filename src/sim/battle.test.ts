import { describe, expect, it } from "vitest";
import { MAX_BATTLE_TICKS, runBattle, type AgentBuild } from "./battle";
import { createRng } from "./rng";

const rawLlm: AgentBuild = { name: "Raw LLM", maxHealth: 120, attack: 9, ticksPerAction: 30, critPercent: 10 };
const hustlrBot: AgentBuild = { name: "Hustlr Bot", maxHealth: 80, attack: 4, ticksPerAction: 12, critPercent: 25 };

describe("runBattle", () => {
  it("gives the same result for the same seed and builds", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      expect(runBattle(seed, rawLlm, hustlrBot)).toEqual(runBattle(seed, rawLlm, hustlrBot));
    }
  });

  it("produces different fights across seeds", () => {
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 200; seed += 1) {
      const result = runBattle(seed, rawLlm, hustlrBot);
      outcomes.add(`${String(result.winner)}:${result.ticks}`);
    }
    expect(outcomes.size).toBeGreaterThan(1);
  });

  it("does not change the builds it is given", () => {
    const left = { ...rawLlm };
    const right = { ...hustlrBot };
    runBattle(7, left, right);
    expect(left).toEqual(rawLlm);
    expect(right).toEqual(hustlrBot);
  });

  it("ends in a draw when nobody can finish the fight", () => {
    const wall: AgentBuild = { name: "Wall", maxHealth: 1_000_000, attack: 1, ticksPerAction: 60, critPercent: 0 };
    const result = runBattle(1, wall, wall);
    expect(result.winner).toBe("draw");
    expect(result.ticks).toBe(MAX_BATTLE_TICKS);
  });

  it("rejects builds that would break determinism", () => {
    expect(() => runBattle(1, { ...rawLlm, attack: 2.5 }, hustlrBot)).toThrow(RangeError);
    expect(() => runBattle(1, rawLlm, { ...hustlrBot, critPercent: 101 })).toThrow(RangeError);
  });
});

describe("createRng", () => {
  it("repeats the same sequence for the same seed", () => {
    const first = createRng(42);
    const second = createRng(42);
    const a = Array.from({ length: 50 }, () => first.nextUint32());
    const b = Array.from({ length: 50 }, () => second.nextUint32());
    expect(a).toEqual(b);
  });

  it("keeps intBelow inside its range", () => {
    const rng = createRng(3);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.intBelow(6);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
    }
  });
});
