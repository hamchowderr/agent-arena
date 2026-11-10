import { describe, expect, it } from "vitest";
import { kitingBot, pickRecommended } from "./bot";
import { restoreAmount } from "./cards";
import { ELITE_SECOND, ENEMIES, LOOT_RUNNER_ESCAPE_SECONDS, PASSIVES, SPLIT_COUNT, SPLIT_INTO, WAVES, WEAPONS, WORLDS, type EnemyKind } from "./content";
import { STAGED_EVENTS } from "./formations";
import { distanceSquared, percentOf, px, seconds } from "./math";
import {
  BOSS_CHEST_PRIZES,
  ELITE_CHEST_PRIZES,
  FUSE_TICKS,
  GEM_LIFE_TICKS,
  LEVEL_UP_HEAL_PERCENT,
  maxHealth,
  xpToNext,
  GEM_SETTLE_TICKS,
  IDLE,
  choose,
  KNOCKBACK,
  TELEGRAPH_TICKS,
  createArena,
  freeOrder,
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
  for (const event of STAGED_EVENTS) {
    state.staged.add(event);
  }
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
    ...freeOrder(state.player.x + dx, state.player.y + dy),
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

  it("locks a charger's aim when its tell starts, so stepping aside dodges it", () => {
    const state = quietArena(37);
    const charger = place(state, "charger", px(60), 0);
    for (let tick = 0; tick < 120 && charger.mode !== "telegraph"; tick += 1) {
      stepIsolated(state, 1, [charger]);
    }
    expect(charger.mode).toBe("telegraph");
    const aim = { x: charger.dashX, y: charger.dashY };
    state.player.y += px(80);
    for (let tick = 0; tick < 120 && charger.mode !== "dash"; tick += 1) {
      stepIsolated(state, 1, [charger]);
    }
    expect(charger.mode).toBe("dash");
    expect({ x: charger.dashX, y: charger.dashY }).toEqual(aim);
    expect(aim.x).toBeLessThan(0);
    expect(aim.y).toBe(0);
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

  it("drops a chest from the elite that spins one random upgrade with no picking", () => {
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
    expect(chest?.prizes).toBe(ELITE_CHEST_PRIZES);
    expect(state.gems.some((gem) => !gem.chest && gem.value === elite.xp)).toBe(true);
    state.weapons.length = 0;
    const opened: ArenaEvent[] = [];
    for (let tick = 0; tick < 120 && opened.length === 0; tick += 1) {
      state.enemies.length = 0;
      step(state, IDLE);
      opened.push(...state.events.filter((event) => event.kind === "chest"));
      expect(state.status).toBe("playing");
    }
    expect(opened).toHaveLength(1);
    const event = opened[0];
    if (event?.kind !== "chest" || !event.prize) {
      throw new Error("chest opened without a prize");
    }
    expect(event.reel).toContainEqual(event.prize);
    expect(state.cards).toEqual([]);
  });

  it("drops a three-prize chest and a big gem when the boss dies", () => {
    const state = quietArena(41);
    const boss = place(state, "boss", 20, 0, 1);
    state.bossId = boss.id;
    pulseWith(state);
    step(state, IDLE);
    expect(state.gems.find((gem) => gem.chest)?.prizes).toBe(BOSS_CHEST_PRIZES);
    expect(state.gems.some((gem) => !gem.chest && gem.value === boss.xp)).toBe(true);
  });

  it("keeps the elite in play when the agent runs far away", () => {
    const state = quietArena(43);
    const elite = place(state, "brute", 470, 0);
    Object.assign(elite, { elite: true });
    step(state, IDLE);
    expect(state.enemies).toContain(elite);
    expect(distanceSquared(elite.x, elite.y, state.player.x, state.player.y)).toBeLessThan(px(300) * px(300));
  });

  it("leaves uncollected XP where it fell, then lets it expire", () => {
    const state = quietArena(45);
    const gem = { x: state.player.x + px(200), y: state.player.y, value: 3, chest: false, prizes: 0, settle: GEM_SETTLE_TICKS, life: GEM_LIFE_TICKS, pulled: false };
    state.gems.push(gem);
    for (let tick = 0; tick < GEM_SETTLE_TICKS + GEM_LIFE_TICKS - 1; tick += 1) {
      state.enemies.length = 0;
      step(state, IDLE);
    }
    expect(state.gems).toContain(gem);
    expect(gem.x).toBe(state.player.x + px(200));
    state.enemies.length = 0;
    step(state, IDLE);
    expect(state.gems).not.toContain(gem);
    expect(state.xp).toBe(0);
  });

  it("heals the agent a little on every level-up", () => {
    const state = quietArena(47);
    state.player.health = 10;
    state.gems.push({ x: state.player.x, y: state.player.y, value: xpToNext(state.level), chest: false, prizes: 0, settle: 0, life: GEM_LIFE_TICKS, pulled: true });
    step(state, IDLE);
    expect(state.level).toBe(2);
    expect(state.player.health).toBe(10 + percentOf(maxHealth(state), LEVEL_UP_HEAL_PERCENT));
  });

  it("still levels up and heals once every card is maxed or banished", () => {
    const state = quietArena(46);
    for (const id of [...Object.keys(WEAPONS), ...Object.keys(PASSIVES)]) {
      state.banished.add(id as never);
    }
    state.player.health = 10;
    state.pendingLevelUps = 1;
    step(state, IDLE);
    expect(state.status).toBe("levelUp");
    expect(state.cards.map((card) => card.kind)).toEqual(["restore"]);
    choose(state, 0);
    expect(state.player.health).toBe(10 + restoreAmount(state));
  });

  it("leaves drops on the floor long enough to see them before they fly to the agent", () => {
    const state = quietArena(44);
    place(state, "grunt", 4, 0, 1);
    pulseWith(state);
    step(state, IDLE);
    const gem = state.gems[0];
    expect(gem).toBeDefined();
    for (let tick = 1; tick < GEM_SETTLE_TICKS; tick += 1) {
      state.weapons.length = 0;
      step(state, IDLE);
      expect(state.gems).toContain(gem);
    }
  });
});
