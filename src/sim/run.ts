import { runBattle, type AgentBuild, type BattleResult } from "./battle";
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

export type RunStatus = "drafting" | "lost" | "cleared";

export interface RunState {
  readonly seed: number;
  readonly stages: readonly Stage[];
  readonly loadout: AnyLoadout;
  readonly fights: readonly FightRecord[];
  readonly status: RunStatus;
}

export interface UpcomingFight {
  readonly stage: Stage;
  readonly fight: StageFight;
  readonly number: number;
}

export interface FightOutcome {
  readonly run: RunState;
  readonly player: AgentBuild;
  readonly enemy: AgentBuild;
  readonly battle: BattleResult;
}

export function newRun(seed: number, stages: readonly Stage[] = STAGES): RunState {
  const first = stages[0];
  if (!first) {
    throw new RangeError("A run needs at least one stage");
  }
  return { seed, stages, loadout: { name: "Your agent", tier: first.tier, parts: [] }, fights: [], status: "drafting" };
}

export function upcomingFight(run: RunState): UpcomingFight | undefined {
  let index = run.fights.length;
  for (const stage of run.stages) {
    const fight = stage.fights[index];
    if (fight) {
      return { stage, fight, number: run.fights.length + 1 };
    }
    index -= stage.fights.length;
  }
  return undefined;
}

export function openDraft(run: RunState): DraftState {
  assertDrafting(run);
  return startDraft(mixSeed(run.seed, (run.fights.length + 1) * 2), run.loadout);
}

export function policySeed(run: RunState): number {
  return mixSeed(run.seed, (run.fights.length + 1) * 2 + 1);
}

export function fightAfterDraft(run: RunState, draft: DraftState): FightOutcome {
  assertDrafting(run);
  const upcoming = upcomingFight(run);
  if (!upcoming) {
    throw new RangeError("No fight left in this run");
  }
  const player = buildAgent(draft.loadout);
  const enemy = buildAgent(upcoming.fight.enemy);
  const battle = runBattle(policySeed(run), player, enemy);
  const won = battle.winner === 0;
  const fights = [...run.fights, { tier: upcoming.stage.tier, boss: upcoming.fight.boss, won }];
  const afterFight: RunState = { ...run, loadout: draft.loadout, fights };
  const next = upcomingFight(afterFight);
  const status: RunStatus = !won ? "lost" : next ? "drafting" : "cleared";
  const loadout = won && next ? ({ ...draft.loadout, tier: next.stage.tier } as AnyLoadout) : draft.loadout;
  return { run: { ...afterFight, loadout, status }, player, enemy, battle };
}

export function playRun(seed: number, policy: DraftPolicy, stages: readonly Stage[] = STAGES): RunResult {
  let run = newRun(seed, stages);
  while (run.status === "drafting") {
    run = fightAfterDraft(run, policy(openDraft(run), policySeed(run))).run;
  }
  return { fights: run.fights, cleared: run.status === "cleared", finalLoadout: run.loadout };
}

function assertDrafting(run: RunState): void {
  if (run.status !== "drafting") {
    throw new RangeError(`This run is over: ${run.status}`);
  }
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
