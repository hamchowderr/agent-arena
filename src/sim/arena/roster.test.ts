import { describe, expect, it } from "vitest";
import { kitingBot, pickRecommended } from "./bot";
import { ELITE_SECOND, ENEMIES, LOOT_RUNNER_ESCAPE_SECONDS, SPLIT_COUNT, SPLIT_INTO, WAVES, WORLDS, type EnemyKind } from "./content";
import { distanceSquared, px, seconds } from "./math";
import {
  FUSE_TICKS,
  IDLE,
  KNOCKBACK,
  TELEGRAPH_TICKS,
  createArena,
  step,
  type ArenaEvent,
  type ArenaState,
  type Enemy,
} from "./sim";

function quietArena(seed: number): ArenaState {
  const state = createArena(seed);
  state.weapons.length = 0;
  state.nextBossTick = Number.MAX_SAFE_INTEGER;
  state.lootSpawned = true;
  state.eliteSpawned = true;
  return state;
}

function place(state: ArenaState, kind: EnemyKind, dx: number, dy: number, health = 9999): Enemy {
  const definition = ENEMIES[kind];
  const enemy: Enemy = {
    id: 50000 + state.enemies.length,
    kind,
    elite: false,
    mass: definition.mass,
    mode: "move",
    timer: 0,
    dashX: 0,
    dashY: 0,
    x: state.player.x + dx,
    y: state.player.y + dy,
    health,
    maxHealth: health,
    hitFlash: 0,
    knockX: 0,
    knockY: 0,
    speed: definition.speed,
    damage: definition.damage,
    radius: px(definition.radius),
    xp: definition.xp,
  };
  state.enemies.push(enemy);
  return enemy;
}

function stepIsolated(state: ArenaState, ticks: number, keep: Enemy[]): ArenaEvent[] {
  const events: ArenaEvent[] = [];
  for (let tick = 0; tick < ticks && state.status === "playing"; tick += 1) {
    state.enemies.length = 0;
    state.enemies.push(...keep.filter((enemy) => enemy.health > 0));
    step(state, IDLE);
    events.push(...state.events);
  }
  return events;
}

function pulseWith(state: ArenaState): void {
  state.weapons.length = 0;
  state.weapons.push({ id: "shell", level: 1, cooldown: 0, orbitHits: new Map() });
}

describe("world rosters", () => {
  it("gives every world five tier slots and keeps the wave table in time order", () => {
    for (const world of WORLDS) {
      expect(world.slots).toHaveLength(5);
      expect(world.minAlive).toBeLessThan(world.maxAlive);
    }
    for (let index = 1; index < WAVES.length; index += 1) {
      expect(WAVES[index]?.fromSecond ?? 0).toBeGreaterThan(WAVES[index - 1]?.fromSecond ?? 0);
    }
  });

  it("slides the tier mix from fodder toward heavies over a world", () => {
    const averageSlot = (weights: readonly number[]) =>
      weights.reduce((sum, weight, slot) => sum + weight * slot, 0) / weights.reduce((sum, weight) => sum + weight, 0);
    for (let index = 1; index < WAVES.length; index += 1) {
      expect(averageSlot(WAVES[index]?.weights ?? [])).toBeGreaterThan(averageSlot(WAVES[index - 1]?.weights ?? []));
    }
  });

  it("only spawns the current world's enemies, and keeps shooters under the cap", () => {
    const state = createArena(4);
    const world = WORLDS[0];
    const allowed = new Set<EnemyKind>([...(world?.slots ?? []), SPLIT_INTO, "lootRunner", "boss"]);
    let elites = 0;
    while (state.tick < seconds(75) && (state.status === "playing" || state.status === "levelUp")) {
      if (state.status === "levelUp") {
        pickRecommended(state);
        continue;
      }
      state.player.health = 999;
      step(state, kitingBot(state));
      elites += state.events.filter((event) => event.kind === "eliteArrives").length;
      for (const enemy of state.enemies) {
        expect(allowed.has(enemy.kind)).toBe(true);
      }
      expect(state.enemies.filter((enemy) => enemy.kind === "shooter").length).toBeLessThanOrEqual(world?.maxShooters ?? 0);
    }
    expect(elites).toBe(1);
  }, 30000);
});

describe("enemy behaviors", () => {
  it("telegraphs every charge, shot and blast for at least half a second", () => {
    expect(TELEGRAPH_TICKS).toBeGreaterThanOrEqual(seconds(0.5));
    expect(FUSE_TICKS).toBeGreaterThanOrEqual(seconds(0.5));
    const state = quietArena(31);
    const charger = place(state, "charger", px(60), 0);
    let still = 0;
    for (let tick = 0; tick < 120 && charger.mode !== "dash"; tick += 1) {
      const before = charger.x;
      stepIsolated(state, 1, [charger]);
      if (charger.mode === "telegraph" && charger.x === before) {
        still += 1;
      }
    }
    expect(charger.mode).toBe("dash");
    expect(still).toBeGreaterThanOrEqual(TELEGRAPH_TICKS - 1);
  });

  it("blows up an exploder next to the agent and hurts it", () => {
    const state = quietArena(32);
    const exploder = place(state, "exploder", px(10), 0);
    const events = stepIsolated(state, FUSE_TICKS + 4, [exploder]);
    expect(events.some((event) => event.kind === "blast")).toBe(true);
    expect(events.some((event) => event.kind === "hurt" && event.source === "exploder")).toBe(true);
    expect(exploder.health).toBe(0);
  });

  it("splits a splitter into children pushed away from the agent", () => {
    const state = quietArena(33);
    pulseWith(state);
    const splitter = place(state, "splitter", px(20), 0, 1);
    const before = new Set(state.enemies.map((enemy) => enemy.id));
    step(state, IDLE);
    const children = state.enemies.filter(
      (enemy) => enemy.kind === SPLIT_INTO && !before.has(enemy.id) && distanceSquared(enemy.x, enemy.y, splitter.x, splitter.y) < px(30) * px(30),
    );
    expect(splitter.health).toBeLessThanOrEqual(0);
    expect(children).toHaveLength(SPLIT_COUNT);
    for (const child of children) {
      expect(child.knockX).toBeGreaterThan(0);
    }
  });

  it("lets a heavy shrug off knockback that throws fodder", () => {
    const state = quietArena(34);
    pulseWith(state);
    const grunt = place(state, "grunt", px(20), 0);
    const heavy = place(state, "heavy", -px(20), 0);
    step(state, IDLE);
    expect(Math.abs(grunt.knockX)).toBeGreaterThan(Math.abs(heavy.knockX) * 3);
    expect(Math.abs(grunt.knockX)).toBeLessThanOrEqual(KNOCKBACK * 2);
  });

  it("makes the loot runner flee, drop tokens on every hit, and escape in time", () => {
    const state = quietArena(35);
    const runner = place(state, "lootRunner", px(40), 0);
    runner.timer = seconds(LOOT_RUNNER_ESCAPE_SECONDS);
    pulseWith(state);
    state.weapons[0] = { id: "shell", level: 1, cooldown: 0, orbitHits: new Map() };
    runner.x = state.player.x + px(20);
    step(state, IDLE);
    expect(state.gems.length).toBeGreaterThan(0);
    state.weapons.length = 0;
    const start = distanceSquared(runner.x, runner.y, state.player.x, state.player.y);
    const events = stepIsolated(state, seconds(LOOT_RUNNER_ESCAPE_SECONDS) + 2, [runner]);
    expect(distanceSquared(runner.x, runner.y, state.player.x, state.player.y)).toBeGreaterThan(start);
    expect(events.some((event) => event.kind === "lootEscaped")).toBe(true);
    expect(events.some((event) => event.kind === "kill")).toBe(false);
  });

  it("drops a chest from the elite that opens a level-up", () => {
    const state = createArena(36);
    state.weapons.length = 0;
    state.nextBossTick = Number.MAX_SAFE_INTEGER;
    state.lootSpawned = true;
    state.worldStartTick = state.tick - seconds(ELITE_SECOND);
    step(state, IDLE);
    const elite = state.enemies.find((enemy) => enemy.elite);
    expect(elite).toBeDefined();
    if (!elite) {
      return;
    }
    expect(elite.maxHealth).toBeGreaterThan(ENEMIES[elite.kind].health * 5);
    elite.x = state.player.x + px(20);
    elite.y = state.player.y;
    elite.health = 1;
    state.enemies.length = 0;
    state.enemies.push(elite);
    pulseWith(state);
    step(state, IDLE);
    const chest = state.gems.find((gem) => gem.chest);
    expect(chest).toBeDefined();
    state.weapons.length = 0;
    let opened = false;
    for (let tick = 0; tick < 120 && !opened; tick += 1) {
      if (chest) {
        chest.pulled = true;
      }
      state.enemies.length = 0;
      step(state, IDLE);
      opened = state.events.some((event) => event.kind === "chest");
      if (state.status === "levelUp") {
        opened = true;
      }
    }
    expect(opened).toBe(true);
  });
});
