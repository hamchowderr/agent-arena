import { describe, expect, it } from "vitest";
import runLoopDoc from "../../../docs/run-loop.md?raw";
import { kitingBot, pickRecommended } from "./bot";
import { ENEMIES, WORLDS } from "./content";
import { px, seconds } from "./math";
import { isTerminal, nextPhase, RUN_EVENTS, RUN_LOOP, RUN_PHASES, runLoopMermaid, type RunPhase } from "./run-loop";
import { exploreModel, modelKey, statesThatCanReach } from "./run-loop-model";
import { createArena, freeOrder, step, IDLE, type ArenaState } from "./sim";

function finalBossDiesAsPlayerIsHit(): ArenaState {
  const state = createArena(3);
  state.bossesDown = 4;
  state.tier = 5;
  state.player.health = 1;
  state.weapons.length = 0;
  state.weapons.push({ id: "voice", level: 1, cooldown: 0, orbitHits: new Map() });
  const at = state.player;
  state.enemies.push({ id: 9001, kind: "boss", x: at.x + px(4), y: at.y, health: 1, maxHealth: 1, hitFlash: 0, knockX: 0, knockY: 0, elite: false, mass: 0, mode: "move", timer: 0, dashX: 0, dashY: 0, speed: 0, damage: 999, radius: px(ENEMIES.boss.radius), xp: 1, ...freeOrder(0, 0) });
  state.bossId = 9001;
  state.nextBossTick = Number.MAX_SAFE_INTEGER;
  state.enemies.push({ id: 9002, kind: "brute", x: at.x, y: at.y + px(2), health: 9999, maxHealth: 9999, hitFlash: 0, knockX: 0, knockY: 0, elite: false, mass: 0, mode: "move", timer: 0, dashX: 0, dashY: 0, speed: 0, damage: 999, radius: px(9), xp: 1, ...freeOrder(0, 0) });
  step(state, IDLE);
  return state;
}

describe("run loop", () => {
  it("keeps a win once the final boss falls, even if the agent is hit in the same tick", () => {
    const state = finalBossDiesAsPlayerIsHit();
    expect(state.bossesDown).toBe(5);
    expect(state.status).toBe("won");
  });
});

describe("run loop model check", () => {
  const graph = exploreModel();
  const states = [...graph.states.values()];

  it("explores the whole state space", () => {
    expect(graph.states.size).toBeGreaterThan(100);
  });

  it("never needs a move the statechart forbids", () => {
    expect(graph.violations).toEqual([]);
  });

  it("has no dead ends: every reachable state can move", () => {
    const stuck = states.filter((state) => (graph.edges.get(modelKey(state)) ?? []).length === 0);
    expect(stuck).toEqual([]);
  });

  it("can always still end the run, from every reachable state", () => {
    const canEnd = statesThatCanReach(graph, (state) => isTerminal(state.phase));
    const trapped = states.filter((state) => !canEnd.has(modelKey(state)));
    expect(trapped).toEqual([]);
  });

  it("wins only with every boss beaten", () => {
    expect(states.filter((state) => state.phase === "won" && state.bossesDown !== WORLDS.length)).toEqual([]);
  });

  it("never skips a boss: the count rises by one, only when an active boss falls", () => {
    for (const [key, edges] of graph.edges) {
      const from = graph.states.get(key);
      for (const edge of edges) {
        if (from && edge.to.bossesDown > from.bossesDown) {
          expect(edge.action).toBe("bossDown");
          expect(from.bossActive).toBe(true);
          expect(edge.to.bossesDown).toBe(from.bossesDown + 1);
        }
        if (from && edge.to.bossesDown < from.bossesDown) {
          expect(["start", "toTitle"]).toContain(edge.action);
        }
      }
    }
  });

  it("leaves a finished run only by starting over or going to the title", () => {
    for (const phase of ["dead", "won"] as const) {
      expect(Object.keys(RUN_LOOP[phase]).sort()).toEqual(["start", "toTitle"]);
    }
  });

  it("resumes to exactly where it paused", () => {
    expect(nextPhase("pausedPlaying", "resume")).toBe("playing");
    expect(nextPhase("pausedLevelUp", "resume")).toBe("levelUp");
  });

  it("uses every transition in the statechart, so none is dead weight", () => {
    const used = new Set<string>();
    for (const [key, edges] of graph.edges) {
      const from = graph.states.get(key);
      for (const edge of edges) {
        let phase: RunPhase | undefined = from?.phase;
        for (const event of edge.events) {
          used.add(`${phase}:${event}`);
          phase = phase ? (nextPhase(phase, event) ?? undefined) : undefined;
        }
      }
    }
    const declared = RUN_PHASES.flatMap((phase) => RUN_EVENTS.filter((event) => RUN_LOOP[phase][event]).map((event) => `${phase}:${event}`));
    expect(declared.filter((transition) => !used.has(transition))).toEqual([]);
  });

  it("matches the diagram in docs/run-loop.md", () => {
    expect(runLoopDoc).toContain(runLoopMermaid());
  });
});

describe("real runs follow the statechart", () => {
  it.each([1, 2, 5])("seed %i ends in exactly one terminal state and counts every boss", (seed) => {
    const state = createArena(seed);
    let bossesSeen = 0;
    let previous: RunPhase = state.status;
    const limit = seconds(60 * 14);
    while (!isTerminal(state.status) && state.tick < limit) {
      if (state.status === "levelUp") {
        pickRecommended(state);
      } else {
        step(state, kitingBot(state));
        bossesSeen += state.events.filter((event) => event.kind === "bossDown").length;
      }
      const reachable = previous === state.status || RUN_EVENTS.some((event) => nextPhase(previous, event) === state.status);
      expect(reachable).toBe(true);
      previous = state.status;
    }
    expect(bossesSeen).toBe(state.bossesDown);
    if (state.status === "won") {
      expect(state.bossesDown).toBe(WORLDS.length);
    }
    const frozen = { tick: state.tick, status: state.status };
    step(state, kitingBot(state));
    expect({ tick: state.tick, status: state.status }).toEqual(frozen);
  }, 120000);
});
