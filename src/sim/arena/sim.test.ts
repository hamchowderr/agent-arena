import { describe, expect, it } from "vitest";
import { playBotRun } from "./bot";
import { offerCards } from "./cards";
import { MAX_PASSIVES, MAX_WEAPONS, WEAPONS, WORLDS } from "./content";
import { distanceSquared, px, seconds, SUB } from "./math";
import { BOSS_ENTRY_DISTANCE, HEAD_START_CARDS_PER_WORLD, KNOCKBACK, bossesBeaten, choose, createArena, currentWorld, freeOrder, IDLE, dronePosition, maxHealth, orbitPosition, step, xpToNext } from "./sim";

describe("arena sim", () => {
  it("replays the same run from the same seed", () => {
    const first = playBotRun(42, seconds(90));
    const second = playBotRun(42, seconds(90));
    expect(second.hash).toBe(first.hash);
    expect(second.state.kills).toBe(first.state.kills);
    expect(second.state.level).toBe(first.state.level);
  });

  it("plays differently with a different seed", () => {
    expect(playBotRun(1, seconds(60)).hash).not.toBe(playBotRun(2, seconds(60)).hash);
  });

  it("kills a standing agent eventually", () => {
    const state = createArena(7);
    while (state.status === "playing" && state.tick < seconds(600)) {
      step(state, IDLE);
      if (state.cards.length > 0) {
        choose(state, 0);
      }
    }
    expect(state.status).toBe("dead");
    expect(state.killedBy).not.toBeNull();
  });

  it("lets the kiting bot level up and survive the first minute", () => {
    const runs = [1, 2, 3, 4, 5].map((seed) => playBotRun(seed, seconds(60)).state);
    for (const state of runs) {
      expect(state.status).toBe("playing");
      expect(state.level).toBeGreaterThanOrEqual(3);
      expect(state.kills).toBeGreaterThan(30);
    }
    expect(runs.reduce((sum, state) => sum + state.level, 0) / runs.length).toBeGreaterThanOrEqual(5);
  });

  it("brings the first boss at two minutes, on screen just above the player", () => {
    const state = createArena(9);
    let arrived = -1;
    while (state.tick < seconds(130) && arrived < 0) {
      step(state, { moveX: 1, moveY: 0, dash: false });
      if (state.cards.length > 0) {
        choose(state, 0);
      }
      if (state.events.some((event) => event.kind === "bossArrives")) {
        arrived = state.tick;
        const boss = state.enemies.find((enemy) => enemy.id === state.bossId);
        expect(boss).toBeDefined();
        if (boss) {
          expect(boss.y).toBeLessThan(state.player.y);
          expect(distanceSquared(boss.x, boss.y, state.player.x, state.player.y)).toBeLessThanOrEqual(BOSS_ENTRY_DISTANCE * BOSS_ENTRY_DISTANCE + SUB * SUB * 4);
        }
      }
      if (state.status === "dead") {
        break;
      }
    }
    expect(state.status === "dead" || arrived === seconds(120)).toBe(true);
  });

  it("never offers more than three cards, and marks exactly one recommended", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const cards = offerCards(createArena(seed));
      expect(cards.length).toBeLessThanOrEqual(3);
      expect(cards.filter((card) => card.recommended)).toHaveLength(1);
      for (const card of cards) {
        expect(card.changes.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps weapons and passives within their slot limits over a long run", () => {
    for (const seed of [11, 12, 13]) {
      const { state } = playBotRun(seed, seconds(300));
      expect(state.weapons.length).toBeLessThanOrEqual(MAX_WEAPONS);
      expect(state.passives.size).toBeLessThanOrEqual(MAX_PASSIVES);
      for (const weapon of state.weapons) {
        expect(weapon.level).toBeLessThanOrEqual(WEAPONS[weapon.id].levels.length);
      }
      const ids = state.weapons.map((weapon) => weapon.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(state.player.health).toBeLessThanOrEqual(maxHealth(state));
    }
  }, 30000);

  it("asks for more xp at each level", () => {
    for (let level = 1; level < 60; level += 1) {
      expect(xpToNext(level + 1)).toBeGreaterThan(xpToNext(level));
    }
  });
});

describe("knockback", () => {
  it("pushes a hit enemy away from the agent, then settles", () => {
    const state = createArena(11);
    state.weapons.length = 0;
    state.weapons.push({ id: "voice", level: 1, cooldown: 0, orbitHits: new Map() });
    state.nextBossTick = Number.MAX_SAFE_INTEGER;
    const at = state.player;
    state.enemies.push({ id: 7001, kind: "brute", x: at.x + px(30), y: at.y, health: 9999, maxHealth: 9999, hitFlash: 0, knockX: 0, knockY: 0, elite: false, mass: 0, mode: "move", timer: 0, dashX: 0, dashY: 0, speed: 0, damage: 1, radius: px(9), xp: 1, ...freeOrder(0, 0) });
    const brute = state.enemies[state.enemies.length - 1];
    const startX = brute?.x ?? 0;
    step(state, IDLE);
    expect(brute?.knockX ?? 0).toBeGreaterThan(0);
    for (let tick = 0; tick < 20; tick += 1) {
      step(state, IDLE);
    }
    expect((brute?.x ?? 0) - startX).toBeGreaterThan(SUB * 2);
    expect(Math.abs(brute?.knockX ?? 99)).toBeLessThan(KNOCKBACK);
  });

  it("fires sub-agent shots from helper drones that fly beside the agent", () => {
    const state = createArena(13);
    state.weapons.length = 0;
    state.weapons.push({ id: "subagents", level: 3, cooldown: 0, orbitHits: new Map() });
    state.nextBossTick = Number.MAX_SAFE_INTEGER;
    state.eliteSpawned = true;
    state.lootSpawned = true;
    const at = state.player;
    state.enemies.push({ id: 7003, kind: "brute", x: at.x + px(120), y: at.y, health: 9999, maxHealth: 9999, hitFlash: 0, knockX: 0, knockY: 0, elite: false, mass: 0, mode: "move", timer: 0, dashX: 0, dashY: 0, speed: 0, damage: 1, radius: px(9), xp: 1, ...freeOrder(0, 0) });
    const drones = [0, 1, 2].map((index) => dronePosition(state, index, 3));
    step(state, IDLE);
    const shots = state.projectiles.filter((projectile) => projectile.weapon === "subagents");
    expect(shots).toHaveLength(3);
    shots.forEach((shot, index) => {
      const drone = drones[index];
      expect(Math.hypot(shot.x - shot.vx - (drone?.x ?? 0), shot.y - shot.vy - (drone?.y ?? 0))).toBeLessThan(px(4));
      expect(Math.hypot((drone?.x ?? 0) - at.x, (drone?.y ?? 0) - at.y)).toBeGreaterThan(px(20));
    });
  });

  it("lets orbiting browser cursors shove fodder clear instead of grinding in place", () => {
    const shoved = () => {
      const state = createArena(12);
      state.weapons.length = 0;
      state.weapons.push({ id: "browser", level: 1, cooldown: 0, orbitHits: new Map() });
      state.nextBossTick = Number.MAX_SAFE_INTEGER;
      state.eliteSpawned = true;
      state.lootSpawned = true;
      const blade = orbitPosition(state, { id: "browser", level: 1, cooldown: 0, orbitHits: new Map() }, 0);
      state.enemies.push({ id: 7002, kind: "grunt", x: blade.x, y: blade.y, health: 9999, maxHealth: 9999, hitFlash: 0, knockX: 0, knockY: 0, elite: false, mass: 0, mode: "move", timer: 0, dashX: 0, dashY: 0, speed: 0, damage: 1, radius: px(6), xp: 1, ...freeOrder(0, 0) });
      step(state, IDLE);
      return Math.hypot(state.enemies[0]?.knockX ?? 0, state.enemies[0]?.knockY ?? 0);
    };
    expect(shoved()).toBeGreaterThanOrEqual(KNOCKBACK * 3);
  });
});

describe("starting at a later world", () => {
  it("drops you into that world's tier with a head start of cards", () => {
    const state = createArena(21, 2);
    expect(currentWorld(state).id).toBe(WORLDS[2]?.id);
    expect(state.tier).toBe(WORLDS[2]?.tier);
    expect(state.player.health).toBe(maxHealth(state));
    expect(state.pendingLevelUps).toBe(2 * HEAD_START_CARDS_PER_WORLD);
    expect(state.level).toBe(1 + 2 * HEAD_START_CARDS_PER_WORLD);
    expect(bossesBeaten(state)).toBe(0);
    step(state, IDLE);
    expect(state.status).toBe("levelUp");
  });

  it("brings that world's boss after the usual two minutes", () => {
    const state = createArena(5, 3);
    while (state.pendingLevelUps > 0 || state.status === "levelUp") {
      if (state.status === "levelUp") {
        choose(state, 0);
      } else {
        step(state, IDLE);
      }
    }
    expect(state.nextBossTick).toBe(seconds(120));
  });

  it("keeps the start world in range", () => {
    expect(createArena(1, 99).startWorld).toBe(WORLDS.length - 1);
    expect(createArena(1, -3).startWorld).toBe(0);
    expect(createArena(1, 1.5).startWorld).toBe(0);
  });
});
