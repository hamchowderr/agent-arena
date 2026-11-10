import { describe, expect, it } from "vitest";
import { playBotRun } from "./bot";
import { offerCards } from "./cards";
import { MAX_PASSIVES, MAX_WEAPONS, WEAPONS } from "./content";
import { seconds } from "./math";
import { choose, createArena, IDLE, maxHealth, step, xpToNext } from "./sim";

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
    const { state } = playBotRun(3, seconds(60));
    expect(state.status).toBe("playing");
    expect(state.level).toBeGreaterThanOrEqual(4);
    expect(state.kills).toBeGreaterThan(30);
  });

  it("brings the first boss at two minutes", () => {
    const state = createArena(9);
    let arrived = -1;
    while (state.tick < seconds(130) && arrived < 0) {
      step(state, { moveX: 1, moveY: 0, dash: false });
      if (state.cards.length > 0) {
        choose(state, 0);
      }
      if (state.events.some((event) => event.kind === "bossArrives")) {
        arrived = state.tick;
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
