import { describe, expect, it } from "vitest";
import { buildAgent } from "./loadout";
import { BALANCE_TARGETS, greedyPolicy, playRun, randomPolicy, STAGES, stageReport } from "./run";
import { TIERS } from "./tiers";

const percent = (part: number, whole: number): number => Math.floor((part * 100) / whole);

describe("playRun", () => {
  it("replays the same run for the same seed", () => {
    for (let seed = 0; seed < 30; seed += 1) {
      expect(playRun(seed, greedyPolicy)).toEqual(playRun(seed, greedyPolicy));
    }
  });

  it("has one stage per tier, each ending in a boss, with valid rival loadouts", () => {
    expect(STAGES.map((stage) => stage.tier)).toEqual(TIERS.map((entry) => entry.tier));
    for (const stage of STAGES) {
      expect(stage.fights.at(-1)?.boss).toBe(true);
      for (const fight of stage.fights) {
        expect(fight.enemy.tier).toBe(stage.tier);
        expect(() => buildAgent(fight.enemy)).not.toThrow();
      }
    }
  });

  it("ends the run at the first loss", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const run = playRun(seed, randomPolicy);
      const losses = run.fights.filter((fight) => !fight.won);
      expect(losses.length).toBe(run.cleared ? 0 : 1);
      if (!run.cleared) {
        expect(run.fights.at(-1)?.won).toBe(false);
      }
    }
  });
});

describe("balance targets", () => {
  const seeds = Array.from({ length: BALANCE_TARGETS.runs }, (_, seed) => seed);
  const greedyRuns = seeds.map((seed) => playRun(seed, greedyPolicy));
  const randomRuns = seeds.map((seed) => playRun(seed, randomPolicy));

  it.each(stageReport(greedyRuns))("greedy bot clears stage $tier ($name) at a target rate", (stage) => {
    const band = BALANCE_TARGETS.greedyStageClear[stage.tier];
    expect(stage.clearPercent).toBeGreaterThanOrEqual(band.min);
    expect(stage.clearPercent).toBeLessThanOrEqual(band.max);
  });

  it("lets a greedy bot reach IPO at the target rate", () => {
    const rate = percent(greedyRuns.filter((run) => run.cleared).length, greedyRuns.length);
    expect(rate).toBeGreaterThanOrEqual(BALANCE_TARGETS.greedyReachIpo.min);
    expect(rate).toBeLessThanOrEqual(BALANCE_TARGETS.greedyReachIpo.max);
  });

  it("rewards drafting well: a random bot almost never reaches IPO", () => {
    const rate = percent(randomRuns.filter((run) => run.cleared).length, randomRuns.length);
    expect(rate).toBeLessThanOrEqual(BALANCE_TARGETS.randomReachIpoMax);
  });
});
