import { describe, expect, it } from "vitest";
import { kitingBot, pickRecommended } from "./bot";
import { BOSS_EVERY_SECONDS, DEFAULT_LOADOUT, WORLDS } from "./content";
import { px, seconds } from "./math";
import { createArena, elapsedSeconds, IDLE, KIT_LEASH, KIT_OFFSET, step, type ArenaState, type Input, type Opening } from "./sim";

const RIGHT: Input = { moveX: 1, moveY: 0, dash: false };
const LEFT: Input = { moveX: -1, moveY: 0, dash: false };

function walkToKit(state: ArenaState): number {
  let ticks = 0;
  while (state.kit !== null && ticks < seconds(10)) {
    step(state, RIGHT);
    ticks += 1;
  }
  return ticks;
}

function playFor(state: ArenaState, ticks: number): void {
  const until = state.tick + ticks;
  while (state.tick < until && (state.status === "playing" || state.status === "levelUp")) {
    if (state.status === "levelUp") {
      pickRecommended(state);
      continue;
    }
    step(state, kitingBot(state));
  }
}

describe("the run's opening", () => {
  it("puts a starter crate next to the player only on runs that ask for it", () => {
    expect(createArena(1).kit).toBeNull();
    expect(createArena(1, 2, DEFAULT_LOADOUT, "firstWorld").kit).toBeNull();
    expect(createArena(1, 0, DEFAULT_LOADOUT, "firstWorld").kit).toEqual({ x: KIT_OFFSET, y: 0 });
    expect(createArena(1, 2, DEFAULT_LOADOUT, "everyWorld").kit).toEqual({ x: KIT_OFFSET, y: 0 });
  });

  it("holds the clock and spawns nothing until the crate is opened", () => {
    const state = createArena(5, 0, DEFAULT_LOADOUT, "everyWorld");
    const bossAt = state.nextBossTick;
    for (let tick = 0; tick < seconds(40); tick += 1) {
      step(state, IDLE);
    }
    expect(state.enemies).toHaveLength(0);
    expect(elapsedSeconds(state)).toBe(0);
    expect(state.nextBossTick - state.tick).toBe(bossAt);
    expect(state.status).toBe("playing");
  });

  it("keeps the player on a leash around the crate", () => {
    const state = createArena(5, 0, DEFAULT_LOADOUT, "everyWorld");
    for (let tick = 0; tick < seconds(20); tick += 1) {
      step(state, LEFT);
    }
    expect(state.kit).not.toBeNull();
    expect(KIT_OFFSET - state.player.x).toBeLessThanOrEqual(KIT_LEASH);
  });

  it("opens a free card pick when the player reaches the crate, then starts the clock", () => {
    const state = createArena(5, 0, DEFAULT_LOADOUT, "everyWorld");
    const walked = walkToKit(state);
    expect(walked).toBeLessThan(seconds(3));
    expect(state.kit).toBeNull();
    expect(state.status).toBe("levelUp");
    expect(state.level).toBe(1);
    expect(state.events.some((event) => event.kind === "kitOpened")).toBe(true);
    pickRecommended(state);
    playFor(state, seconds(BOSS_EVERY_SECONDS) - 1);
    expect(state.bossId).toBeNull();
    playFor(state, 2);
    expect(state.bossId).not.toBeNull();
  });

  it("lets the first seconds breathe before the arena fills", () => {
    const state = createArena(9, 0, DEFAULT_LOADOUT, "everyWorld");
    walkToKit(state);
    pickRecommended(state);
    playFor(state, seconds(1) - 2);
    expect(state.enemies).toHaveLength(0);
    playFor(state, seconds(4));
    expect(state.enemies.length).toBeLessThan(WORLDS[0]?.minAlive ?? 0);
  });

  it("spaces the first level-ups at least 10 seconds apart for the bot", () => {
    const state = createArena(3);
    const ups: number[] = [];
    while (ups.length < 3 && state.tick < seconds(90) && state.status !== "dead") {
      if (state.status === "levelUp") {
        ups.push(state.tick);
        pickRecommended(state);
        continue;
      }
      step(state, kitingBot(state));
    }
    expect(ups).toHaveLength(3);
    expect(ups[0]).toBeGreaterThanOrEqual(seconds(10));
    expect((ups[2] ?? 0) - (ups[0] ?? 0)).toBeGreaterThanOrEqual(seconds(15));
  });

  function beatFirstBoss(opening: Opening): ArenaState {
    const state = createArena(17, 0, DEFAULT_LOADOUT, opening);
    walkToKit(state);
    if (state.status === "levelUp") {
      pickRecommended(state);
    }
    state.weapons.length = 0;
    state.nextBossTick = state.tick + 1;
    step(state, IDLE);
    state.enemies.splice(0, state.enemies.length, ...state.enemies.filter((enemy) => enemy.id === state.bossId));
    state.player.health = 99999;
    for (let attempt = 0; attempt < 400 && state.bossesDown === 0; attempt += 1) {
      const boss = state.enemies.find((enemy) => enemy.id === state.bossId);
      if (boss) {
        boss.health = Math.min(boss.health, 1);
        boss.x = state.player.x + px(20);
        boss.y = state.player.y;
      }
      state.weapons.splice(0, state.weapons.length, { id: "voice", level: 1, cooldown: 0, orbitHits: new Map() });
      step(state, IDLE);
      state.weapons.length = 0;
    }
    return state;
  }

  it("drops a crate for the next world when a boss goes down, and the crate holds the free pick", () => {
    const state = beatFirstBoss("everyWorld");
    expect(state.bossesDown).toBe(1);
    expect(state.kit).toEqual({ x: state.player.x + KIT_OFFSET, y: state.player.y });
    expect(state.status).toBe("playing");
    const clock = elapsedSeconds(state);
    const enemies = state.enemies.length;
    for (let tick = 0; tick < seconds(5); tick += 1) {
      step(state, IDLE);
    }
    expect(elapsedSeconds(state)).toBe(clock);
    expect(state.enemies).toHaveLength(enemies);
    const level = state.level;
    walkToKit(state);
    expect(state.kit).toBeNull();
    expect(state.status).toBe("levelUp");
    expect(state.level).toBe(level);
    expect(state.events.some((event) => event.kind === "kitOpened")).toBe(true);
  });

  it("keeps the old free pick right after the boss on runs without a crate for every world", () => {
    const state = beatFirstBoss("firstWorld");
    expect(state.bossesDown).toBe(1);
    expect(state.kit).toBeNull();
    expect(state.status).toBe("levelUp");
  });
});
