import { describe, expect, it } from "vitest";
import { kitingBot, pickRecommended } from "./bot";
import { BOSS_PHASE_FLOORS, WORLDS } from "./content";
import { px, seconds } from "./math";
import { bossPenalty, createArena, IDLE, step, type ArenaEvent, type ArenaState, type Enemy } from "./sim";

function arenaWithBoss(seed: number): { state: ArenaState; boss: Enemy } {
  const state = createArena(seed);
  state.weapons.length = 0;
  state.nextBossTick = 1;
  step(state, IDLE);
  const boss = state.enemies.find((enemy) => enemy.id === state.bossId);
  if (!boss) {
    throw new Error("boss did not spawn");
  }
  state.enemies.length = 0;
  state.enemies.push(boss);
  boss.x = state.player.x + px(20);
  boss.y = state.player.y;
  state.player.health = 99999;
  return { state, boss };
}

function floorOf(boss: Enemy, phase: 1 | 2): number {
  return Math.trunc((boss.maxHealth * (BOSS_PHASE_FLOORS[phase - 1] ?? 0)) / 100);
}

function pulseOnce(state: ArenaState): ArenaEvent[] {
  const boss = state.enemies.find((enemy) => enemy.id === state.bossId);
  if (boss) {
    boss.x = state.player.x + px(20);
    boss.y = state.player.y;
  }
  state.weapons.length = 0;
  state.weapons.push({ id: "voice", level: 1, cooldown: 0, orbitHits: new Map() });
  step(state, IDLE);
  state.weapons.length = 0;
  return state.events;
}

describe("boss phases", () => {
  it("tells the game when the boss starts its first attack, once per fight", () => {
    const { state } = arenaWithBoss(26);
    const attacks: ArenaEvent[] = [];
    for (let tick = 0; tick < seconds(20); tick += 1) {
      state.player.health = 99999;
      step(state, IDLE);
      attacks.push(...state.events.filter((event) => event.kind === "bossAttack"));
    }
    expect(attacks).toEqual([{ kind: "bossAttack", world: 0, pattern: WORLDS[0]?.pattern }]);
  });

  it("clamps a big hit at the phase floor instead of skipping a phase", () => {
    const { state, boss } = arenaWithBoss(21);
    boss.health = floorOf(boss, 1) + 1;
    const events = pulseOnce(state);
    expect(boss.health).toBe(floorOf(boss, 1));
    expect(state.fight?.phase).toBe(2);
    expect(events.filter((event) => event.kind === "bossPhase")).toHaveLength(1);
  });

  it("ignores damage while the boss changes phase", () => {
    const { state, boss } = arenaWithBoss(22);
    boss.health = floorOf(boss, 1) + 1;
    pulseOnce(state);
    const held = boss.health;
    pulseOnce(state);
    expect(boss.health).toBe(held);
  });

  it("goes through phase 2 and phase 3 before the boss can die", () => {
    const { state, boss } = arenaWithBoss(23);
    const phases: number[] = [];
    let down = false;
    for (let attempt = 0; attempt < 200 && !down; attempt += 1) {
      boss.health = Math.min(boss.health, 1);
      for (const event of pulseOnce(state)) {
        if (event.kind === "bossPhase") {
          phases.push(event.phase);
        }
        if (event.kind === "bossDown") {
          down = true;
        }
      }
      while (state.fight && state.fight.transition > 0) {
        step(state, IDLE);
      }
    }
    expect(down).toBe(true);
    expect(phases).toEqual([2, 3]);
  });

  it("takes the agent over when phase 3 runs out of time", () => {
    const { state, boss } = arenaWithBoss(24);
    state.passives.set("fewShot", 1);
    boss.health = floorOf(boss, 2) + 1;
    state.fight = state.fight && { ...state.fight, phase: 2 };
    pulseOnce(state);
    expect(state.fight?.phase).toBe(3);
    let acquired = false;
    for (let tick = 0; tick < seconds(70) && state.status === "playing"; tick += 1) {
      state.player.health = 99999;
      step(state, IDLE);
      acquired ||= state.events.some((event) => event.kind === "acquired");
    }
    expect(acquired).toBe(true);
    expect(state.status).toBe("dead");
    expect(state.killedBy).toEqual({ world: WORLDS[0]?.id, enemy: "boss" });
  });

  it("punishes a missing harness part only from phase 2, and never once the part is owned", () => {
    const { state } = arenaWithBoss(25);
    expect(bossPenalty(state, "spread")).toBe(false);
    state.fight = state.fight && { ...state.fight, phase: 2 };
    expect(bossPenalty(state, "spread")).toBe(true);
    expect(bossPenalty(state, "trail")).toBe(false);
    state.passives.set("fewShot", 1);
    expect(bossPenalty(state, "spread")).toBe(false);
  });

  it("goes through phases 2 and 3 in order before every boss the bot beats", () => {
    let beaten = 0;
    for (let seed = 1; seed <= 8 && beaten < 2; seed += 1) {
      const state = createArena(seed);
      let phases: number[] = [];
      while (state.tick < seconds(330) && (state.status === "playing" || state.status === "levelUp")) {
        if (state.status === "levelUp") {
          pickRecommended(state);
          continue;
        }
        step(state, kitingBot(state));
        for (const event of state.events) {
          if (event.kind === "bossArrives") {
            phases = [];
          }
          if (event.kind === "bossPhase") {
            phases.push(event.phase);
          }
          if (event.kind === "bossDown") {
            expect(phases).toEqual([2, 3]);
            beaten += 1;
          }
        }
      }
    }
    expect(beaten).toBeGreaterThanOrEqual(2);
  }, 60000);
});
