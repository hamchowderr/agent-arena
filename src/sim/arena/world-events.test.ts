import { describe, expect, it } from "vitest";
import { PASSIVES, SIGNATURE_SECOND, SWARM_SECOND, TWISTS, WALL_RING_SECOND, WORLDS, type GroundHazard, type RegularKind, type WorldId } from "./content";
import { ALL_HANDS_LIFE, STAGED_EVENTS, WALL_RING_LIFE, type StagedEvent } from "./formations";
import { px, seconds } from "./math";
import {
  GATE_ROOT_TICKS,
  IDLE,
  LEECH_TICKS,
  PATCH_WARMUP,
  TELEGRAPH_TICKS,
  createArena,
  fakeSharePercent,
  pickupRadius,
  step,
  throttlePercent,
  type ArenaEvent,
  type ArenaState,
  type Enemy,
  type Patch,
} from "./sim";

function worldIndex(id: WorldId): number {
  return WORLDS.findIndex((world) => world.id === id);
}

function arenaIn(id: WorldId, seed = 5): ArenaState {
  const state = createArena(seed);
  const index = worldIndex(id);
  state.bossesDown = index;
  state.tier = WORLDS[index]?.tier ?? 1;
  state.weapons.length = 0;
  state.nextBossTick = Number.MAX_SAFE_INTEGER;
  state.lootSpawned = true;
  state.eliteSpawned = true;
  state.player.health = 99999;
  return state;
}

function quiet(state: ArenaState): ArenaState {
  for (const event of STAGED_EVENTS) {
    state.staged.add(event);
  }
  state.patchTimer = Number.MAX_SAFE_INTEGER;
  return state;
}

function slotKind(id: WorldId, slot: number): RegularKind {
  const kind = WORLDS[worldIndex(id)]?.slots[slot];
  if (!kind) {
    throw new Error(`no slot ${slot} in ${id}`);
  }
  return kind;
}

function jumpTo(state: ArenaState, second: number): void {
  state.worldStartTick = state.tick - seconds(second) + 1;
}

function stagedAt(id: WorldId, event: StagedEvent, second: number): { state: ArenaState; before: Set<number>; events: ArenaEvent[] } {
  const state = arenaIn(id);
  for (const other of STAGED_EVENTS) {
    if (other !== event) {
      state.staged.add(other);
    }
  }
  state.patchTimer = Number.MAX_SAFE_INTEGER;
  jumpTo(state, second);
  const before = new Set(state.enemies.map((enemy) => enemy.id));
  step(state, IDLE);
  return { state, before, events: state.events };
}

function spawnedSince(state: ArenaState, before: Set<number>, reach = px(240)): Enemy[] {
  return state.enemies.filter((enemy) => !before.has(enemy.id) && (enemy.x - state.player.x) ** 2 + (enemy.y - state.player.y) ** 2 < reach * reach);
}

function addPatch(state: ArenaState, kind: GroundHazard, warmup = 0): Patch {
  const patch: Patch = { id: 70000 + state.patches.length, kind, x: state.player.x, y: state.player.y, radius: px(30), life: seconds(30), warmup };
  state.patches.push(patch);
  return patch;
}

describe("world event table", () => {
  it("gives every world a signature wave, and every world after the tutorial a twist with a real counter and a ground hazard", () => {
    expect(new Set(WORLDS.map((world) => world.signature)).size).toBe(WORLDS.length);
    for (const world of WORLDS.slice(1)) {
      expect(world.twist).not.toBe("none");
      expect(world.hazard).not.toBeNull();
      const counter = TWISTS[world.twist].counter;
      expect(counter === null ? undefined : PASSIVES[counter]).toBeDefined();
    }
    expect(WORLDS[0]?.twist).toBe("none");
    expect(WORLDS[0]?.hazard).toBeNull();
  });

  it("fires the wall ring, the signature wave and the swarm once each, in order, in every world", () => {
    for (const world of WORLDS) {
      const state = arenaIn(world.id, 9);
      state.patchTimer = Number.MAX_SAFE_INTEGER;
      const seen: { event: StagedEvent; second: number }[] = [];
      while (state.tick < seconds(SWARM_SECOND + 2)) {
        state.player.health = 99999;
        step(state, IDLE);
        for (const event of state.events) {
          if (event.kind === "staged") {
            seen.push({ event: event.event, second: Math.trunc(state.tick / 60) });
          }
        }
      }
      expect(seen).toEqual([
        { event: "wallRing", second: WALL_RING_SECOND },
        { event: "signature", second: SIGNATURE_SECOND },
        { event: "swarm", second: SWARM_SECOND },
      ]);
    }
  }, 30000);

  it("pauses the regular stream right after an event, so a formation replaces the wave instead of stacking on it", () => {
    const { state, before } = stagedAt("hustlr", "wallRing", WALL_RING_SECOND);
    const formation = spawnedSince(state, before).length;
    for (let tick = 0; tick < seconds(5); tick += 1) {
      step(state, IDLE);
    }
    expect(formation).toBeGreaterThanOrEqual(WORLDS[0]?.minAlive ?? 0);
    expect(spawnedSince(state, before).length).toBe(formation);
  });
});

describe("formations", () => {
  it("rings the agent with walls that hold still, ignore knockback and leave without counting as kills", () => {
    const { state, before } = stagedAt("hustlr", "wallRing", WALL_RING_SECOND);
    const walls = spawnedSince(state, before);
    expect(walls.length).toBeGreaterThanOrEqual(24);
    for (const wall of walls) {
      expect(wall.mass).toBe(100);
      expect(wall.order).toBe("hold");
    }
    const first = walls[0];
    const start = { x: first?.x ?? 0, y: first?.y ?? 0 };
    const kills = state.kills;
    for (let tick = 0; tick < WALL_RING_LIFE + 2; tick += 1) {
      step(state, IDLE);
    }
    expect(state.enemies.some((enemy) => walls.includes(enemy))).toBe(false);
    expect(state.kills).toBe(kills);
    expect(first ? Math.abs(first.x - start.x) + Math.abs(first.y - start.y) : 0).toBeLessThan(px(4));
  });

  it("sends the swarm straight across instead of chasing", () => {
    const { state, before } = stagedAt("hustlr", "swarm", SWARM_SECOND);
    const swarm = spawnedSince(state, before, px(400)).filter((enemy) => enemy.order === "march");
    expect(swarm.length).toBe(26);
    const bug = swarm[0];
    if (!bug) {
      return;
    }
    const start = { x: bug.x, y: bug.y };
    state.player.x += px(200);
    for (let tick = 0; tick < 10; tick += 1) {
      state.enemies.length = 0;
      state.enemies.push(bug);
      step(state, IDLE);
    }
    expect({ x: bug.x - start.x, y: bug.y - start.y }).toEqual({ x: bug.driftX * 10, y: bug.driftY * 10 });
  });

  it("closes the All-Hands ring and blocks every shot from inside it until the agent gets behind a blocker", () => {
    const { state, before } = stagedAt("synergex", "signature", SIGNATURE_SECOND);
    const blockers = spawnedSince(state, before);
    expect(blockers.every((enemy) => enemy.guardsFront)).toBe(true);
    for (let tick = 0; tick < seconds(5); tick += 1) {
      step(state, IDLE);
    }
    const blocker = blockers[0];
    if (!blocker) {
      return;
    }
    const health = blocker.health;
    state.enemies.length = 0;
    state.enemies.push(blocker);
    state.weapons.push({ id: "shell", level: 5, cooldown: 0, orbitHits: new Map() });
    state.player.x = blocker.x - Math.trunc((blocker.x - blocker.anchorX) / 3);
    state.player.y = blocker.y - Math.trunc((blocker.y - blocker.anchorY) / 3);
    step(state, IDLE);
    expect(blocker.health).toBe(health);
    expect(state.events.some((event) => event.kind === "pulse")).toBe(true);
    state.weapons[0] = { id: "shell", level: 5, cooldown: 0, orbitHits: new Map() };
    state.player.x = blocker.x + Math.trunc((blocker.x - blocker.anchorX) / 3);
    state.player.y = blocker.y + Math.trunc((blocker.y - blocker.anchorY) / 3);
    step(state, IDLE);
    expect(blocker.health).toBeLessThan(health);
    expect(ALL_HANDS_LIFE).toBeGreaterThan(seconds(5));
  });

  it("makes half of the Mirage School fake", () => {
    const { state, before } = stagedAt("trustMe", "signature", SIGNATURE_SECOND);
    const school = spawnedSince(state, before);
    const fakes = school.filter((enemy) => enemy.fake).length;
    expect(fakes * 2).toBe(school.length);
  });
});

describe("twists", () => {
  it("fakes deal no damage, give no tokens, and pop in one hit; guardrails shrinks their share", () => {
    const state = quiet(arenaIn("trustMe"));
    expect(fakeSharePercent(state)).toBeGreaterThan(0);
    const share = fakeSharePercent(state);
    state.passives.set("guardrails", 2);
    expect(fakeSharePercent(state)).toBeLessThan(share);
    let fakes = 0;
    for (let tick = 0; tick < seconds(20); tick += 1) {
      step(state, IDLE);
    }
    for (const enemy of state.enemies) {
      if (enemy.fake) {
        fakes += 1;
        expect(enemy.damage).toBe(0);
        expect(enemy.xp).toBe(0);
        expect(enemy.health).toBe(1);
      }
    }
    expect(fakes).toBeGreaterThan(0);
  });

  it("lets RAG search shoot straight through fakes", () => {
    const state = quiet(arenaIn("trustMe"));
    state.weapons.push({ id: "ragSearch", level: 1, cooldown: Number.MAX_SAFE_INTEGER, orbitHits: new Map() });
    state.weapons.push({ id: "prompt", level: 1, cooldown: 0, orbitHits: new Map() });
    state.passives.set("guardrails", 5);
    state.enemies.length = 0;
    const fake = makeNear(state, "grunt", px(30), true);
    const real = makeNear(state, "grunt", px(60), false);
    for (let tick = 0; tick < 30; tick += 1) {
      state.enemies.length = 0;
      state.enemies.push(fake, real);
      step(state, IDLE);
    }
    expect(fake.health).toBe(1);
    expect(real.health).toBeLessThan(real.maxHealth);
  });

  it("splits a Synergex Branch into one real child and one hollow decoy", () => {
    const state = quiet(arenaIn("synergex"));
    state.enemies.length = 0;
    const branch = makeNear(state, slotKind("synergex", TWISTS.decoys.slot), px(20), false);
    branch.health = 1;
    state.weapons.push({ id: "shell", level: 1, cooldown: 0, orbitHits: new Map() });
    step(state, IDLE);
    const children = state.enemies.filter((enemy) => enemy !== branch && Math.abs(enemy.x - branch.x) + Math.abs(enemy.y - branch.y) < px(60));
    expect(children.filter((child) => child.fake)).toHaveLength(1);
    expect(children.filter((child) => !child.fake).length).toBeGreaterThan(0);
  });

  it("shrinks the pickup radius for three seconds after a Context Leech hit, less with vector memory", () => {
    const state = quiet(arenaIn("notionally"));
    state.enemies.length = 0;
    const full = pickupRadius(state);
    makeNear(state, slotKind("notionally", TWISTS.leech.slot), px(2), false);
    step(state, IDLE);
    expect(state.player.leechTicks).toBe(LEECH_TICKS);
    const leeched = pickupRadius(state);
    expect(leeched).toBeLessThan(full);
    state.passives.set("vectorMemory", 2);
    expect(pickupRadius(state)).toBeGreaterThan(leeched);
  });

  it("throttles fire rate while a Quota Cutter is close, less with planner", () => {
    const state = quiet(arenaIn("meterly"));
    state.enemies.length = 0;
    makeNear(state, slotKind("meterly", TWISTS.throttle.slot), px(30), false);
    state.grid.rebuild(state.enemies);
    const throttled = throttlePercent(state);
    expect(throttled).toBeGreaterThan(0);
    state.passives.set("planner", 1);
    expect(throttlePercent(state)).toBeLessThan(throttled);
  });
});

describe("ground hazards", () => {
  it("warns before a patch turns on", () => {
    expect(PATCH_WARMUP).toBeGreaterThanOrEqual(seconds(0.5));
    expect(PATCH_WARMUP).toBeGreaterThanOrEqual(TELEGRAPH_TICKS);
    const state = quiet(arenaIn("notionally"));
    state.enemies.length = 0;
    addPatch(state, "dust", PATCH_WARMUP);
    const start = state.player.x;
    step(state, { moveX: 1, moveY: 0, dash: false });
    const free = state.player.x - start;
    state.patches.length = 0;
    addPatch(state, "dust");
    const before = state.player.x;
    step(state, { moveX: 1, moveY: 0, dash: false });
    expect(state.player.x - before).toBeLessThan(free);
  });

  it("roots the agent once per approval gate it walks into", () => {
    const state = quiet(arenaIn("synergex"));
    state.enemies.length = 0;
    addPatch(state, "gate");
    step(state, IDLE);
    expect(state.player.rootTicks).toBe(GATE_ROOT_TICKS);
    const x = state.player.x;
    step(state, { moveX: 1, moveY: 0, dash: false });
    expect(state.player.x).toBe(x);
    for (let tick = 0; tick < GATE_ROOT_TICKS; tick += 1) {
      step(state, IDLE);
    }
    expect(state.player.rootTicks).toBe(0);
  });

  it("charges a token per second on a metered tile", () => {
    const state = quiet(arenaIn("meterly"));
    state.enemies.length = 0;
    state.xp = 5;
    addPatch(state, "meter");
    const events: ArenaEvent[] = [];
    for (let tick = 0; tick < seconds(3); tick += 1) {
      state.enemies.length = 0;
      step(state, IDLE);
      events.push(...state.events);
    }
    expect(state.xp).toBe(2);
    expect(events.filter((event) => event.kind === "metered")).toHaveLength(3);
  });

  it("shortens auto-aim in dark water", () => {
    const state = quiet(arenaIn("trustMe"));
    state.enemies.length = 0;
    state.weapons.push({ id: "prompt", level: 1, cooldown: 0, orbitHits: new Map() });
    const target = makeNear(state, "grunt", px(180), false);
    addPatch(state, "darkWater");
    for (let tick = 0; tick < 4; tick += 1) {
      state.enemies.length = 0;
      state.enemies.push(target);
      step(state, IDLE);
    }
    expect(state.projectiles).toHaveLength(0);
    state.patches.length = 0;
    state.weapons[0] = { id: "prompt", level: 1, cooldown: 0, orbitHits: new Map() };
    state.enemies.length = 0;
    state.enemies.push(target);
    step(state, IDLE);
    expect(state.projectiles.length).toBeGreaterThan(0);
  });
});

function makeNear(state: ArenaState, kind: RegularKind, dx: number, fake: boolean): Enemy {
  const enemy: Enemy = {
    id: 60000 + state.enemies.length + state.tick * 4,
    kind,
    elite: false,
    mass: 0,
    mode: "move",
    timer: 9999,
    dashX: 0,
    dashY: 0,
    x: state.player.x + dx,
    y: state.player.y,
    health: fake ? 1 : 500,
    maxHealth: fake ? 1 : 500,
    hitFlash: 0,
    knockX: 0,
    knockY: 0,
    speed: 0,
    damage: fake ? 0 : 5,
    radius: px(6),
    xp: fake ? 0 : 1,
    order: "free",
    life: 0,
    driftX: 0,
    driftY: 0,
    goalX: 0,
    goalY: 0,
    anchorX: 0,
    anchorY: 0,
    fake,
    guardsFront: false,
  };
  state.enemies.push(enemy);
  return enemy;
}
