import { describe, expect, it } from "vitest";
import { kitingBot } from "./bot";
import { offerCards } from "./cards";
import { DEFAULT_LOADOUT, PASSIVES, WEAPONS, type ArenaLoadout, type PassiveId } from "./content";
import { STAGED_EVENTS } from "./formations";
import { px, seconds } from "./math";
import { act, decodeReplay, encodeReplay, playReplay, startRecording } from "./replay";
import {
  createArena,
  critPercent,
  dashRecharge,
  DASH_RECHARGE,
  effectiveCooldown,
  hallucinationPercent,
  maxHealth,
  ownedStats,
  pickupRadius,
  playerSpeed,
  step,
  IDLE,
  type ArenaState,
} from "./sim";

const GUIDE_PASSIVES = [
  "fewShot",
  "verifier",
  "compaction",
  "logsAndTraces",
  "vectorMemory",
  "loopRunner",
  "toolRouter",
  "conversationBuffer",
  "guardrails",
  "selfCheck",
  "sandbox",
  "mcpConnector",
  "planner",
  "autoTestHook",
];

function quietArena(seed: number, loadout: ArenaLoadout = DEFAULT_LOADOUT): ArenaState {
  const state = createArena(seed, 0, loadout);
  state.nextBossTick = Number.MAX_SAFE_INTEGER;
  state.lootSpawned = true;
  state.eliteSpawned = true;
  for (const event of STAGED_EVENTS) {
    state.staged.add(event);
  }
  return state;
}

function withPassive(id: PassiveId, level: number): ArenaState {
  const state = quietArena(5);
  state.passives.set(id, level);
  return state;
}

describe("passives follow the guide", () => {
  it("drafts exactly the guide's passives, and Long context and Temperature are not among them", () => {
    expect(Object.keys(PASSIVES).sort()).toEqual([...GUIDE_PASSIVES].sort());
    expect(Object.keys(PASSIVES)).not.toContain("longContext");
    expect(Object.keys(PASSIVES)).not.toContain("hotTemperature");
  });

  it("gives every passive its own stat", () => {
    const stats = Object.values(PASSIVES).map((passive) => passive.stat);
    expect(new Set(stats).size).toBe(stats.length);
  });

  it("MCP connector adds one projectile to every tool, and a second at level 4", () => {
    for (const id of ["prompt", "webSearch", "codeExec", "browser", "subagents"] as const) {
      const base = ownedStats(quietArena(5), { id, level: 1 }).count;
      expect(ownedStats(withPassive("mcpConnector", 1), { id, level: 1 }).count).toBe(base + 1);
      expect(ownedStats(withPassive("mcpConnector", 3), { id, level: 1 }).count).toBe(base + 1);
      expect(ownedStats(withPassive("mcpConnector", 4), { id, level: 1 }).count).toBe(base + 2);
    }
  });

  it("MCP connector really fires the extra shot", () => {
    const fire = (state: ArenaState): number => {
      state.weapons[0] = { id: "prompt", level: 1, cooldown: 1, orbitHits: new Map() };
      state.enemies.length = 0;
      state.enemies.push({ ...createEnemyNear(state) });
      step(state, IDLE);
      return state.projectiles.filter((projectile) => projectile.weapon === "prompt").length;
    };
    expect(fire(withPassive("mcpConnector", 1))).toBe(fire(quietArena(5)) + 1);
  });

  it("Verifier raises crit, Logs and traces raise pickup, Tool router cuts cooldowns, Compaction raises max HP", () => {
    const base = quietArena(5);
    expect(critPercent(withPassive("verifier", 2))).toBe(critPercent(base) + 12);
    expect(pickupRadius(withPassive("logsAndTraces", 1))).toBeGreaterThan(pickupRadius(base));
    expect(effectiveCooldown(withPassive("toolRouter", 2), 100)).toBe(86);
    expect(maxHealth(withPassive("compaction", 3))).toBe(maxHealth(base) + 60);
  });

  it("Conversation buffer widens orbits, sound waves and fire zones but not bolts", () => {
    const base = quietArena(5);
    const buffered = withPassive("conversationBuffer", 5);
    for (const id of ["browser", "voice", "codeExec"] as const) {
      expect(ownedStats(buffered, { id, level: 1 }).radius).toBeGreaterThan(ownedStats(base, { id, level: 1 }).radius);
    }
    expect(ownedStats(buffered, { id: "prompt", level: 1 }).radius).toBe(WEAPONS.prompt.levels[0].radius);
  });

  it("Planner recharges the dash sooner", () => {
    expect(dashRecharge(quietArena(5))).toBe(DASH_RECHARGE);
    expect(dashRecharge(withPassive("planner", 2))).toBeLessThan(DASH_RECHARGE);
  });

  it("Self-check catches hallucinated shots", () => {
    const hallucinations = (state: ArenaState): number => {
      let count = 0;
      for (let tick = 0; tick < seconds(60); tick += 1) {
        if (state.status === "levelUp") {
          state.status = "playing";
          state.pendingLevelUps = 0;
        }
        state.player.health = maxHealth(state);
        step(state, kitingBot(state));
        count += state.events.filter((event) => event.kind === "hallucinated").length;
      }
      return count;
    };
    expect(hallucinations(withPassive("selfCheck", 5))).toBeLessThan(hallucinations(quietArena(5)) / 2);
  });

  it("Vector memory earns extra XP over time", () => {
    const earn = (state: ArenaState): number => {
      let total = 0;
      for (let gem = 0; gem < 50; gem += 1) {
        const before = state.xp + state.level * 1000;
        state.gems.push({ x: state.player.x, y: state.player.y, value: 1, chest: false, prizes: 0, settle: 0, life: seconds(30), pulled: true });
        step(state, IDLE);
        total += state.xp + state.level * 1000 - before;
        state.pendingLevelUps = 0;
        state.status = "playing";
      }
      return total;
    };
    expect(earn(withPassive("vectorMemory", 5))).toBeGreaterThan(earn(quietArena(5)));
  });
});

describe("the loadout is picked before the run", () => {
  it("Long context trades speed for max HP", () => {
    const standard = quietArena(5);
    const long = quietArena(5, { context: "long", temperature: "balanced" });
    expect(maxHealth(long)).toBe(maxHealth(standard) + 40);
    expect(long.player.health).toBe(maxHealth(long));
    expect(playerSpeed(long)).toBeLessThan(playerSpeed(standard));
  });

  it("Hot temperature trades hallucinations for crits, cold does the opposite", () => {
    const balanced = quietArena(5);
    const hot = quietArena(5, { context: "standard", temperature: "hot" });
    const cold = quietArena(5, { context: "standard", temperature: "cold" });
    expect(critPercent(hot)).toBeGreaterThan(critPercent(balanced));
    expect(hallucinationPercent(hot)).toBeGreaterThan(hallucinationPercent(balanced));
    expect(critPercent(cold)).toBeLessThan(critPercent(balanced));
    expect(hallucinationPercent(cold)).toBeLessThan(hallucinationPercent(balanced));
  });

  it("never offers a loadout item on a level-up card", () => {
    const state = quietArena(9, { context: "long", temperature: "hot" });
    state.tier = 5;
    for (let roll = 0; roll < 100; roll += 1) {
      for (const card of offerCards(state)) {
        expect(["longContext", "hotTemperature"]).not.toContain(card.id);
      }
    }
  });

  it("carries the loadout in replay links", () => {
    const loadout: ArenaLoadout = { context: "long", temperature: "cold" };
    const state = createArena(77, 0, loadout);
    const recording = startRecording(77, 0, loadout);
    while (state.tick < seconds(40) && (state.status === "playing" || state.status === "levelUp")) {
      act(state, recording, state.status === "levelUp" ? { kind: "choose", index: 0 } : { kind: "step", input: kitingBot(state) });
    }
    const replay = decodeReplay(encodeReplay(recording, state));
    expect(replay?.loadout).toEqual(loadout);
    expect(replay && playReplay(replay).matches).toBe(true);
    expect(replay && playReplay({ ...replay, loadout: DEFAULT_LOADOUT }).matches).toBe(false);
  });
});

function createEnemyNear(state: ArenaState): ArenaState["enemies"][number] {
  const probe = createArena(1);
  for (let tick = 0; tick < seconds(5) && probe.enemies.length === 0; tick += 1) {
    step(probe, IDLE);
  }
  const enemy = probe.enemies[0];
  if (!enemy) {
    throw new Error("no enemy spawned");
  }
  return { ...enemy, id: state.nextId++, x: state.player.x + px(40), y: state.player.y, health: 9999, maxHealth: 9999 };
}
