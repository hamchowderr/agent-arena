import { WORLDS } from "./content";
import { nextPhase, type RunEvent, type RunPhase } from "./run-loop";

export const MODEL_MAX_PENDING = 2;
export const MODEL_REROLLS = 2;
export const MODEL_SKIPS = 2;

export interface ModelState {
  readonly phase: RunPhase;
  readonly bossesDown: number;
  readonly bossActive: boolean;
  readonly pending: number;
  readonly rerolls: number;
  readonly skips: number;
}

export type ModelAction =
  | "start"
  | "toTitle"
  | "gainLevel"
  | "bossArrives"
  | "bossDown"
  | "died"
  | "pause"
  | "resume"
  | "choose"
  | "reroll"
  | "skip"
  | "noCardsLeft";

export interface ModelEdge {
  readonly action: ModelAction;
  readonly events: readonly RunEvent[];
  readonly to: ModelState;
}

export interface ModelViolation {
  readonly from: ModelState;
  readonly action: ModelAction;
  readonly event: RunEvent;
}

export const INITIAL_MODEL_STATE: ModelState = { phase: "title", bossesDown: 0, bossActive: false, pending: 0, rerolls: MODEL_REROLLS, skips: MODEL_SKIPS };

const FRESH_RUN: Omit<ModelState, "phase"> = { bossesDown: 0, bossActive: false, pending: 0, rerolls: MODEL_REROLLS, skips: MODEL_SKIPS };

export function modelKey(state: ModelState): string {
  return `${state.phase}|${state.bossesDown}|${state.bossActive ? 1 : 0}|${state.pending}|${state.rerolls}|${state.skips}`;
}

class Walk {
  readonly events: RunEvent[] = [];
  violation: RunEvent | null = null;

  constructor(public state: ModelState) {}

  fire(event: RunEvent): void {
    if (this.violation !== null) {
      return;
    }
    const next = nextPhase(this.state.phase, event);
    if (next === null) {
      this.violation = event;
      return;
    }
    this.events.push(event);
    this.state = { ...this.state, phase: next };
  }

  set(changes: Partial<ModelState>): void {
    this.state = { ...this.state, ...changes };
  }

  openPendingLevelUp(cardsLeft: boolean): void {
    if (this.state.phase !== "playing" || this.state.pending === 0) {
      return;
    }
    this.set({ pending: this.state.pending - 1 });
    if (cardsLeft) {
      this.fire("levelUpOpened");
    }
  }
}

export function modelSuccessors(state: ModelState): { readonly edges: ModelEdge[]; readonly violations: ModelViolation[] } {
  const edges: ModelEdge[] = [];
  const violations: ModelViolation[] = [];
  const attempt = (action: ModelAction, run: (walk: Walk) => void) => {
    const walk = new Walk(state);
    run(walk);
    if (walk.violation !== null) {
      violations.push({ from: state, action, event: walk.violation });
      return;
    }
    edges.push({ action, events: walk.events, to: walk.state });
  };
  const freshRun = (walk: Walk) => walk.set(FRESH_RUN);

  switch (state.phase) {
    case "title":
      attempt("start", (walk) => {
        freshRun(walk);
        walk.fire("start");
      });
      break;
    case "dead":
    case "won":
      attempt("start", (walk) => {
        freshRun(walk);
        walk.fire("start");
      });
      attempt("toTitle", (walk) => {
        freshRun(walk);
        walk.fire("toTitle");
      });
      break;
    case "playing":
      for (const cardsLeft of [true, false]) {
        attempt(cardsLeft ? "gainLevel" : "noCardsLeft", (walk) => {
          walk.set({ pending: Math.min(MODEL_MAX_PENDING, walk.state.pending + 1) });
          walk.openPendingLevelUp(cardsLeft);
        });
      }
      if (!state.bossActive && state.bossesDown < WORLDS.length) {
        attempt("bossArrives", (walk) => walk.set({ bossActive: true }));
      }
      if (state.bossActive) {
        attempt("bossDown", (walk) => {
          walk.set({ bossActive: false, bossesDown: walk.state.bossesDown + 1, pending: Math.min(MODEL_MAX_PENDING, walk.state.pending + 1) });
          if (walk.state.bossesDown >= WORLDS.length) {
            walk.fire("finalBossDown");
            return;
          }
          walk.openPendingLevelUp(true);
        });
      }
      attempt("died", (walk) => walk.fire("died"));
      attempt("pause", (walk) => walk.fire("pause"));
      break;
    case "levelUp":
      attempt("choose", (walk) => {
        walk.fire("cardTaken");
        walk.openPendingLevelUp(true);
      });
      if (state.rerolls > 0) {
        attempt("reroll", (walk) => walk.set({ rerolls: walk.state.rerolls - 1 }));
      }
      if (state.skips > 0) {
        attempt("skip", (walk) => {
          walk.set({ skips: walk.state.skips - 1 });
          walk.fire("cardTaken");
          walk.openPendingLevelUp(true);
        });
      }
      attempt("pause", (walk) => walk.fire("pause"));
      break;
    case "pausedPlaying":
    case "pausedLevelUp":
      attempt("resume", (walk) => walk.fire("resume"));
      break;
  }
  return { edges, violations };
}

export interface ModelGraph {
  readonly states: ReadonlyMap<string, ModelState>;
  readonly edges: ReadonlyMap<string, readonly ModelEdge[]>;
  readonly violations: readonly ModelViolation[];
}

export function exploreModel(): ModelGraph {
  const states = new Map<string, ModelState>([[modelKey(INITIAL_MODEL_STATE), INITIAL_MODEL_STATE]]);
  const edges = new Map<string, ModelEdge[]>();
  const violations: ModelViolation[] = [];
  const queue: ModelState[] = [INITIAL_MODEL_STATE];
  for (let index = 0; index < queue.length; index += 1) {
    const state = queue[index];
    if (!state) {
      continue;
    }
    const found = modelSuccessors(state);
    edges.set(modelKey(state), found.edges);
    violations.push(...found.violations);
    for (const edge of found.edges) {
      const key = modelKey(edge.to);
      if (!states.has(key)) {
        states.set(key, edge.to);
        queue.push(edge.to);
      }
    }
  }
  return { states, edges, violations };
}

export function statesThatCanReach(graph: ModelGraph, goal: (state: ModelState) => boolean): Set<string> {
  const reverse = new Map<string, string[]>();
  for (const [from, list] of graph.edges) {
    for (const edge of list) {
      const key = modelKey(edge.to);
      reverse.set(key, [...(reverse.get(key) ?? []), from]);
    }
  }
  const reached = new Set<string>();
  const queue: string[] = [];
  for (const [key, state] of graph.states) {
    if (goal(state)) {
      reached.add(key);
      queue.push(key);
    }
  }
  for (let index = 0; index < queue.length; index += 1) {
    const key = queue[index];
    for (const from of key === undefined ? [] : (reverse.get(key) ?? [])) {
      if (!reached.has(from)) {
        reached.add(from);
        queue.push(from);
      }
    }
  }
  return reached;
}
