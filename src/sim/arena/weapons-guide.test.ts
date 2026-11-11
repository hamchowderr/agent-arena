import { describe, expect, it } from "vitest";
import { offerCards } from "./cards";
import { WEAPONS, type WeaponId } from "./content";
import { STAGED_EVENTS } from "./formations";
import { px, seconds } from "./math";
import { BURN_EVERY, BURN_TICKS, createArena, freeOrder, IDLE, orbitPosition, step, type ArenaEvent, type ArenaState, type Enemy } from "./sim";

function quietArena(seed: number): ArenaState {
  const state = createArena(seed);
  state.weapons.length = 0;
  state.nextBossTick = Number.MAX_SAFE_INTEGER;
  state.lootSpawned = true;
  state.eliteSpawned = true;
  for (const event of STAGED_EVENTS) {
    state.staged.add(event);
  }
  return state;
}

function arm(state: ArenaState, id: WeaponId, level: number): void {
  state.weapons.push({ id, level, cooldown: 0, orbitHits: new Map() });
}

function stepQuiet(state: ArenaState, ticks: number): ArenaEvent[] {
  const events: ArenaEvent[] = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    state.enemies.length = 0;
    step(state, IDLE);
    events.push(...state.events);
  }
  return events;
}

function shotAtNextBlade(state: ArenaState): void {
  const owned = state.weapons[0];
  if (!owned) {
    throw new Error("no orbit weapon");
  }
  state.tick += 1;
  const blade = orbitPosition(state, owned, 0);
  state.tick -= 1;
  state.shots.push({ x: blade.x, y: blade.y, vx: 0, vy: 0, life: seconds(4), damage: 50, fake: false, source: "shooter" });
}

describe("weapons follow the Survivor.io guide", () => {
  for (const id of ["browser", "computerUse"] as const) {
    it(`${id} cursors destroy enemy shots they touch`, () => {
      const state = quietArena(3);
      arm(state, id, WEAPONS[id].levels.length);
      const health = state.player.health;
      shotAtNextBlade(state);
      const events = stepQuiet(state, 1);
      expect(events.some((event) => event.kind === "deflected")).toBe(true);
      expect(state.shots).toHaveLength(0);
      expect(state.player.health).toBe(health);
    });
  }

  it("lets a shot through to the agent when no blade is in the way", () => {
    const state = quietArena(3);
    const health = state.player.health;
    state.shots.push({ x: state.player.x + px(20), y: state.player.y, vx: -px(2), vy: 0, life: seconds(4), damage: 5, fake: false, source: "shooter" });
    const events = stepQuiet(state, 20);
    expect(events.some((event) => event.kind === "deflected")).toBe(false);
    expect(state.player.health).toBeLessThan(health);
  });

  function readyToEvolve(): ArenaState {
    const state = quietArena(11);
    arm(state, "webSearch", WEAPONS.webSearch.levels.length);
    state.passives.set("vectorMemory", 1);
    return state;
  }

  it("never offers an evolution on a level-up card", () => {
    const state = readyToEvolve();
    for (let roll = 0; roll < 50; roll += 1) {
      expect(offerCards(state).some((card) => card.kind === "evolve")).toBe(false);
    }
  });

  it("evolves a maxed weapon with its paired passive from the next chest", () => {
    const state = readyToEvolve();
    state.gems.push({ x: state.player.x, y: state.player.y, value: 0, chest: true, prizes: 1, settle: 0, life: seconds(20), pulled: false });
    const chests = stepQuiet(state, 60).filter((event) => event.kind === "chest");
    expect(chests).toHaveLength(1);
    const chest = chests[0];
    expect(chest?.kind === "chest" && chest.prize?.kind).toBe("evolve");
    expect(state.weapons.map((weapon) => weapon.id)).toContain("ragSearch");
    expect(state.weapons.map((weapon) => weapon.id)).not.toContain("webSearch");
  });

  function focused(state: ArenaState): ArenaState {
    state.passives.set("guardrails", 5);
    state.tier = 3;
    return state;
  }

  function dummy(state: ArenaState, dx: number, dy: number): Enemy {
    const enemy: Enemy = { id: 9000 + state.enemies.length, kind: "brute", x: state.player.x + dx, y: state.player.y + dy, health: 9999, maxHealth: 9999, hitFlash: 0, knockX: 0, knockY: 0, elite: false, mass: 0, mode: "move", timer: 0, dashX: 0, dashY: 0, speed: 0, damage: 0, radius: px(9), xp: 1, ...freeOrder(0, 0) };
    state.enemies.push(enemy);
    return enemy;
  }

  function stepWith(state: ArenaState, enemies: readonly Enemy[], ticks: number): ArenaEvent[] {
    const events: ArenaEvent[] = [];
    for (let tick = 0; tick < ticks; tick += 1) {
      state.enemies.length = 0;
      state.enemies.push(...enemies);
      step(state, IDLE);
      events.push(...state.events);
    }
    return events;
  }

  it("lobs code exec as a bomb that lands and leaves a fire zone that keeps burning", () => {
    const state = focused(quietArena(21));
    arm(state, "codeExec", 1);
    const target = dummy(state, px(60), 0);
    const events = stepWith(state, [target], 20);
    expect(events.some((event) => event.kind === "ignite")).toBe(true);
    const landedAt = target.health;
    expect(landedAt).toBe(target.maxHealth);
    state.weapons.length = 0;
    const burns = stepWith(state, [target], BURN_TICKS).filter((event) => event.kind === "burn");
    expect(burns.length).toBeGreaterThanOrEqual(BURN_TICKS / BURN_EVERY - 1);
    expect(target.health).toBeLessThan(landedAt);
    expect(state.flames).toHaveLength(0);
  });

  it("throws the shell brick through several rivals in a line", () => {
    const state = focused(quietArena(22));
    arm(state, "shell", 1);
    const line = [dummy(state, px(30), 0), dummy(state, px(50), 0), dummy(state, px(70), 0)];
    stepWith(state, line, 40);
    expect(line.map((enemy) => enemy.health < enemy.maxHealth)).toEqual([true, true, true]);
  });

  it("steers web search shots onto a rival that moves out of the line", () => {
    const state = focused(quietArena(23));
    arm(state, "webSearch", 1);
    const target = dummy(state, px(80), 0);
    stepWith(state, [target], 1);
    target.y += px(40);
    stepWith(state, [target], 40);
    expect(target.health).toBeLessThan(target.maxHealth);
  });
});
