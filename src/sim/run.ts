import { runBattle, type AgentBuild } from "./battle";
import { pick, skip, startDraft, type DraftState } from "./draft";
import { buildAgent, type AnyLoadout } from "./loadout";
import { mixSeed } from "./rng";
import { TIERS, type Tier } from "./tiers";

export interface StageFight {
  readonly enemy: AnyLoadout;
  readonly boss: boolean;
}

export interface Stage {
  readonly tier: Tier;
  readonly fights: readonly StageFight[];
}

const grunt = (tier: Tier, parts: AnyLoadout["parts"]): StageFight => ({
  enemy: { name: `Stage ${tier} rival`, tier, parts } as AnyLoadout,
  boss: false,
});

const boss = (tier: Tier, parts: AnyLoadout["parts"]): StageFight => ({
  enemy: { name: `Stage ${tier} boss`, tier, parts } as AnyLoadout,
  boss: true,
});

export const STAGES: readonly Stage[] = [
  {
    tier: 1,
    fights: [grunt(1, ["tinyBrain"]), grunt(1, ["tinyBrain", "hotTemperature"]), boss(1, ["midBrain", "hypePrompt"])],
  },
  {
    tier: 2,
    fights: [
      grunt(2, ["midBrain", "hotTemperature"]),
      grunt(2, ["midBrain", "strictPrompt", "conversationBuffer", "longContext"]),
      boss(2, ["midBrain", "hypePrompt", "longContext", "fewShotExamples"]),
    ],
  },
  {
    tier: 3,
    fights: [
      grunt(3, ["midBrain", "strictPrompt", "longContext", "fewShotExamples", "calculator", "toolRouter"]),
      grunt(3, ["frontierBrain", "longContext", "conversationBuffer", "codeExec", "webSearch", "toolRouter"]),
      boss(3, [
        "frontierBrain", "strictPrompt", "longContext", "fewShotExamples", "conversationBuffer",
        "codeExec", "calculator", "fileReader", "toolRouter", "devToolsConnector",
      ]),
    ],
  },
  {
    tier: 4,
    fights: [
      grunt(4, [
        "frontierBrain", "strictPrompt", "longContext", "fewShotExamples", "codeExec", "calculator",
        "toolRouter", "devToolsConnector", "planner", "vectorMemory", "writeTheTest",
      ]),
      grunt(4, [
        "frontierBrain", "hypePrompt", "longContext", "conversationBuffer", "ragSearch", "fileReader",
        "codeExec", "toolRouter", "selfCheck", "refactorSkill",
      ]),
      boss(4, [
        "frontierBrain", "strictPrompt", "longContext", "fewShotExamples", "conversationBuffer", "codeExec",
        "calculator", "fileReader", "webSearch", "toolRouter", "devToolsConnector", "planner", "selfCheck", "vectorMemory",
        "refactorSkill", "writeTheTest",
      ]),
    ],
  },
  {
    tier: 5,
    fights: [
      grunt(5, [
        "frontierBrain", "strictPrompt", "longContext", "fewShotExamples", "ciPipeline", "calculator", "toolRouter",
        "devToolsConnector", "planner", "vectorMemory", "guardrails", "sandbox", "compaction", "refactorSkill",
      ]),
      grunt(5, [
        "frontierBrain", "hypePrompt", "longContext", "conversationBuffer", "ragSearch", "codeExec", "toolRouter",
        "selfCheck", "refactorSkill", "subagents", "verifier", "autoTestHook", "loopRunner", "planner",
      ]),
      boss(5, [
        "frontierBrain", "strictPrompt", "longContext", "fewShotExamples", "conversationBuffer", "codeExec", "calculator",
        "fileReader", "toolRouter", "devToolsConnector", "planner", "selfCheck", "vectorMemory", "refactorSkill",
        "writeTheTest", "guardrails", "sandbox", "compaction", "subagents", "verifier", "autoTestHook",
      ]),
    ],
  },
];

export type DraftPolicy = (state: DraftState, seed: number) => DraftState;

export interface FightRecord {
  readonly tier: Tier;
  readonly boss: boolean;
  readonly won: boolean;
}

export interface RunResult {
  readonly fights: readonly FightRecord[];
  readonly cleared: boolean;
  readonly finalLoadout: AnyLoadout;
}

export function playRun(seed: number, policy: DraftPolicy, stages: readonly Stage[] = STAGES): RunResult {
  let loadout: AnyLoadout = { name: "Your agent", tier: 1, parts: [] };
  const fights: FightRecord[] = [];
  let step = 0;

  for (const stage of stages) {
    loadout = { ...loadout, tier: stage.tier } as AnyLoadout;
    for (const fight of stage.fights) {
      step += 1;
      loadout = policy(startDraft(mixSeed(seed, step * 2), loadout), mixSeed(seed, step * 2 + 1)).loadout;
      const result = runBattle(mixSeed(seed, step * 2 + 1), buildAgent(loadout), buildAgent(fight.enemy));
      const won = result.winner === 0;
      fights.push({ tier: stage.tier, boss: fight.boss, won });
      if (!won) {
        return { fights, cleared: false, finalLoadout: loadout };
      }
    }
  }
  return { fights, cleared: true, finalLoadout: loadout };
}

export function buildScore(build: AgentBuild): number {
  const damagePerAction = build.attack * (100 - build.hallucinationPercent) * (200 + build.critPercent);
  return Math.floor((damagePerAction * build.maxHealth) / build.ticksPerAction);
}

export const greedyPolicy: DraftPolicy = (state) => {
  let best = skip(state);
  let bestScore = buildScore(buildAgent(state.loadout));
  state.offer.forEach((_, index) => {
    const candidate = pick(state, index);
    const score = buildScore(buildAgent(candidate.loadout));
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  });
  return best;
};

export const randomPolicy: DraftPolicy = (state, seed) =>
  state.offer.length === 0 ? skip(state) : pick(state, seed % state.offer.length);

export interface StageReport {
  readonly tier: Tier;
  readonly name: string;
  readonly reached: number;
  readonly cleared: number;
  readonly clearPercent: number;
}

export function stageReport(runs: readonly RunResult[]): StageReport[] {
  return TIERS.map(({ tier, name }) => {
    const reached = runs.filter((run) => run.fights.some((fight) => fight.tier === tier)).length;
    const cleared = runs.filter((run) => run.fights.some((fight) => fight.tier === tier && fight.boss && fight.won)).length;
    return { tier, name, reached, cleared, clearPercent: reached === 0 ? 0 : Math.floor((cleared * 100) / reached) };
  });
}

export interface WinRateBand {
  readonly min: number;
  readonly max: number;
}

export const BALANCE_TARGETS = {
  runs: 1000,
  greedyStageClear: { 1: { min: 78, max: 94 }, 2: { min: 70, max: 88 }, 3: { min: 55, max: 78 }, 4: { min: 60, max: 82 }, 5: { min: 60, max: 85 } },
  greedyReachIpo: { min: 15, max: 35 },
  randomReachIpoMax: 5,
} as const satisfies {
  readonly runs: number;
  readonly greedyStageClear: Readonly<Record<Tier, WinRateBand>>;
  readonly greedyReachIpo: WinRateBand;
  readonly randomReachIpoMax: number;
};
