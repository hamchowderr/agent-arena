import { describe, expect, it } from "vitest";
import { offerCards } from "./cards";
import { EVOLUTIONS, MAX_WEAPONS, MERGES, WEAPONS, type WeaponId } from "./content";
import { STAGED_EVENTS } from "./formations";
import { px, seconds } from "./math";
import { createArena, freeOrder, IDLE, step, type ArenaEvent, type ArenaState, type Enemy } from "./sim";
import { MINE_GAP, RAY_HIT_EVERY, RAY_TICKS } from "./tools";

function quietArena(seed: number): ArenaState {
  const state = createArena(seed);
  state.weapons.length = 0;
  state.nextBossTick = Number.MAX_SAFE_INTEGER;
  state.lootSpawned = true;
  state.eliteSpawned = true;
  state.spawnCarry = Number.MIN_SAFE_INTEGER;
  for (const event of STAGED_EVENTS) {
    state.staged.add(event);
  }
  return state;
}

function arm(state: ArenaState, id: WeaponId, level: number = WEAPONS[id].levels.length): void {
  state.weapons.push({ id, level, cooldown: 1, orbitHits: new Map() });
}

let nextId = 5000;

function dummy(state: ArenaState, dx: number, dy: number): Enemy {
  const x = state.player.x + px(dx);
  const y = state.player.y + px(dy);
  nextId += 1;
  const enemy: Enemy = { id: nextId, kind: "heavy", x, y, health: 999999, maxHealth: 999999, hitFlash: 0, knockX: 0, knockY: 0, elite: false, mass: 100, mode: "move", timer: 0, dashX: 0, dashY: 0, speed: 0, damage: 0, radius: px(6), xp: 0, ...freeOrder(x, y) };
  state.enemies.push(enemy);
  return enemy;
}

function run(state: ArenaState, ticks: number): ArenaEvent[] {
  const events: ArenaEvent[] = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    step(state, IDLE);
    events.push(...state.events);
  }
  return events;
}

function hitsOn(events: readonly ArenaEvent[], enemy: Enemy): number {
  return events.filter((event) => event.kind === "damage" && event.x === enemy.x && event.y === enemy.y).length;
}

function noMisses(state: ArenaState): void {
  state.passives.set("guardrails", 99);
}

describe("file reader", () => {
  it("lasers every rival on its line, again and again, and misses rivals off the line", () => {
    const state = quietArena(1);
    noMisses(state);
    arm(state, "fileReader", 1);
    const near = dummy(state, 40, 0);
    const far = dummy(state, 120, 0);
    const off = dummy(state, 60, 50);
    const events = run(state, RAY_TICKS + 2);
    expect(hitsOn(events, near)).toBe(RAY_TICKS / RAY_HIT_EVERY);
    expect(hitsOn(events, far)).toBe(RAY_TICKS / RAY_HIT_EVERY);
    expect(hitsOn(events, off)).toBe(0);
  });

  it("evolves into map-reduce: a wide fan of lasers that reduces into a blast where the middle one ends", () => {
    const state = quietArena(2);
    noMisses(state);
    arm(state, "mapReduce");
    dummy(state, 60, 0);
    const events = run(state, RAY_TICKS + 2);
    expect(state.rays).toHaveLength(0);
    expect(events.filter((event) => event.kind === "reduced")).toHaveLength(1);
  });
});

describe("api call", () => {
  it("jumps from the nearest rival to the next ones in reach, never further", () => {
    const state = quietArena(3);
    arm(state, "apiCall", 1);
    const links = [dummy(state, 30, 0), dummy(state, 70, 0), dummy(state, 110, 0), dummy(state, 150, 0)];
    const outOfReach = dummy(state, 300, 0);
    const events = run(state, 2);
    const chains = events.filter((event) => event.kind === "chain");
    expect(chains).toHaveLength(1);
    for (const link of links) {
      expect(hitsOn(events, link)).toBe(1);
    }
    expect(hitsOn(events, outOfReach)).toBe(0);
    const chain = chains[0];
    expect(chain?.kind === "chain" ? chain.points.length / 2 : 0).toBe(links.length + 1);
  });

  it("evolves into an MCP server with three chains that never hit the same rival twice", () => {
    const state = quietArena(4);
    arm(state, "mcpServer");
    const crowd = Array.from({ length: 40 }, (_, index) => dummy(state, 30 + (index % 8) * 30, -80 + Math.trunc(index / 8) * 40));
    const events = run(state, 2);
    expect(events.filter((event) => event.kind === "chain")).toHaveLength(3);
    for (const enemy of crowd) {
      expect(hitsOn(events, enemy)).toBeLessThanOrEqual(1);
    }
  });
});

describe("scheduled job", () => {
  it("drops a ring of mines that go off one after another, in order", () => {
    const state = quietArena(5);
    arm(state, "scheduledJob", 1);
    const blasts: { order: number; tick: number }[] = [];
    for (let tick = 0; tick < seconds(2); tick += 1) {
      step(state, IDLE);
      for (const event of state.events) {
        if (event.kind === "mine") {
          blasts.push({ order: event.order, tick: state.tick });
        }
      }
    }
    expect(blasts.map((blast) => blast.order)).toEqual([0, 1, 2]);
    expect((blasts[1]?.tick ?? 0) - (blasts[0]?.tick ?? 0)).toBe(MINE_GAP);
  });

  it("evolves into a durable workflow whose mines go off three times each", () => {
    const state = quietArena(6);
    arm(state, "durableWorkflow");
    run(state, 1);
    state.weapons.length = 0;
    const events = run(state, seconds(6));
    const mines = WEAPONS.durableWorkflow.levels[0].count;
    expect(events.filter((event) => event.kind === "mine")).toHaveLength(mines * 3);
    expect(state.mines).toHaveLength(0);
  });
});

describe("coder subagent", () => {
  it("fires missiles that splash rivals next to the one they hit", () => {
    const state = quietArena(7);
    noMisses(state);
    arm(state, "coderSubagent", 1);
    const target = dummy(state, 50, 0);
    const neighbor = dummy(state, 50, 12);
    const events = run(state, seconds(3));
    expect(events.some((event) => event.kind === "splash")).toBe(true);
    expect(hitsOn(events, target) + hitsOn(events, neighbor)).toBeGreaterThan(1);
    expect(hitsOn(events, neighbor)).toBeGreaterThan(0);
  });
});

describe("weapon + weapon evolutions", () => {
  function chestUnder(state: ArenaState): void {
    state.gems.push({ x: state.player.x, y: state.player.y, value: 0, chest: true, prizes: 1, settle: 0, life: seconds(20), pulled: false });
  }

  it("merges maxed researcher and coder subagents into an agent network from a chest, freeing a weapon slot", () => {
    const state = quietArena(8);
    arm(state, "subagents");
    arm(state, "coderSubagent");
    chestUnder(state);
    run(state, 60);
    const owned = state.weapons.map((weapon) => weapon.id);
    expect(owned).toEqual(["agentNetwork"]);
    expect(owned.length).toBeLessThan(MAX_WEAPONS);
  });

  it("does not merge until both subagents are maxed", () => {
    const state = quietArena(9);
    arm(state, "subagents");
    arm(state, "coderSubagent", 4);
    chestUnder(state);
    run(state, 60);
    expect(state.weapons.map((weapon) => weapon.id)).not.toContain("agentNetwork");
  });

  it("then turns the agent network into a durable agent team with a loop runner", () => {
    const state = quietArena(10);
    arm(state, "agentNetwork");
    state.passives.set("loopRunner", 1);
    chestUnder(state);
    run(state, 60);
    expect(state.weapons.map((weapon) => weapon.id)).toEqual(["durableAgentTeam"]);
  });

  it("never offers either subagent again once they merged", () => {
    const state = quietArena(11);
    state.tier = 5;
    arm(state, "agentNetwork");
    for (let roll = 0; roll < 60; roll += 1) {
      const offered = offerCards(state).map((card) => card.id);
      expect(offered).not.toContain("subagents");
      expect(offered).not.toContain("coderSubagent");
    }
  });

  it("gives every evolved weapon exactly one recipe", () => {
    const evolved = (Object.keys(WEAPONS) as WeaponId[]).filter((id) => "evolved" in WEAPONS[id]);
    const recipes = [...EVOLUTIONS.map((entry) => entry.result), ...MERGES.map((entry) => entry.result)];
    expect(recipes.sort()).toEqual(evolved.filter((id) => recipes.includes(id)).sort());
    expect(new Set(recipes).size).toBe(recipes.length);
  });
});

describe("realtime voice agent", () => {
  it("evolves from maxed voice and conversation buffer in a chest", () => {
    const state = quietArena(12);
    arm(state, "voice");
    state.passives.set("conversationBuffer", 1);
    state.gems.push({ x: state.player.x, y: state.player.y, value: 0, chest: true, prizes: 1, settle: 0, life: seconds(20), pulled: false });
    run(state, 60);
    expect(state.weapons.map((weapon) => weapon.id)).toEqual(["realtimeVoice"]);
  });

  it("cuts enemy shots inside its wave out of the air and leaves shots outside it alone", () => {
    const state = quietArena(13);
    arm(state, "realtimeVoice");
    const reach = px(WEAPONS.realtimeVoice.levels[0].radius);
    const shot = (dx: number) => ({ x: state.player.x + dx, y: state.player.y + px(200), vx: 0, vy: 0, life: seconds(4), damage: 0, fake: false, source: "shooter" as const });
    const inside = shot(0);
    const outside = shot(0);
    inside.y = state.player.y + reach - px(4);
    outside.y = state.player.y + reach + px(30);
    state.shots.push(inside, outside);
    const events = run(state, 2);
    expect(events.filter((event) => event.kind === "interrupted")).toHaveLength(1);
    expect(state.shots).toEqual([outside]);
  });

  it("plain voice never interrupts shots", () => {
    const state = quietArena(14);
    arm(state, "voice");
    state.shots.push({ x: state.player.x, y: state.player.y + px(10), vx: 0, vy: 0, life: seconds(4), damage: 0, fake: false, source: "shooter" });
    const events = run(state, 2);
    expect(events.some((event) => event.kind === "pulse")).toBe(true);
    expect(events.some((event) => event.kind === "interrupted")).toBe(false);
  });
});

describe("new tools stay deterministic", () => {
  it("plays the same seed the same way with every new tool armed", () => {
    const play = () => {
      const state = createArena(42);
      for (const id of ["fileReader", "apiCall", "scheduledJob", "coderSubagent"] as const) {
        arm(state, id);
      }
      const trace: number[] = [];
      for (let tick = 0; tick < seconds(40) && state.status === "playing"; tick += 1) {
        step(state, { moveX: tick % 240 < 120 ? 1 : -1, moveY: 0, dash: false });
        trace.push(state.kills, state.enemies.length, state.mines.length, state.rays.length);
      }
      return trace;
    };
    expect(play()).toEqual(play());
  });
});
