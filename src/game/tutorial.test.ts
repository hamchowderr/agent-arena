import { describe, expect, it } from "vitest";
import { LOADERS, LOCALES, t } from "../i18n";
import { TICKS_PER_SECOND } from "../sim/arena/math";
import { createArena, type ArenaState } from "../sim/arena/sim";
import { HOW_TO_PLAY, introScene, type Scene } from "./story";
import { memoryOf, StoryPlayer } from "./story-player";
import { BOSS_WARNING_SECONDS, FIGHT_KILLS, GOALS, LESSON_ID, MOVE_DISTANCE, NAG_SECONDS, pickLesson, staleLesson, Tutorial, type LessonLine } from "./tutorial";

const words = { weapon: "WEAPON", passive: "PASSIVE", fresh: "NEW", level: "LV 1 → 2", evolve: "EVOLVE", recommended: "★ RECOMMENDED" };

function setup(active = true) {
  const told: Scene[] = [];
  const taught: Scene[] = [];
  const lesson: readonly LessonLine[] = pickLesson(words);
  const tutorial = new Tutorial(
    active,
    (scene) => told.push(scene),
    (scene) => taught.push(scene),
    () => lesson,
  );
  const state = createArena(7);
  return { tutorial, state, told, taught, said: () => told.flatMap((scene) => scene.lines.map((line) => line.key)) };
}

function walk(tutorial: Tutorial, state: ArenaState, distance: number): void {
  const step = 40;
  for (let gone = 0; gone < distance; gone += step) {
    state.player.x += step;
    tutorial.frame(state, 1 / 60, false);
  }
}

function open(tutorial: Tutorial, state: ArenaState): void {
  tutorial.frame(state, 0.016, true);
  tutorial.frame(state, 0.016, false);
}

describe("first-run tutorial", () => {
  it("does nothing when the player has already finished it", () => {
    const { tutorial, state, told } = setup(false);
    open(tutorial, state);
    walk(tutorial, state, MOVE_DISTANCE * 2);
    expect(told).toHaveLength(0);
    expect(tutorial.objective(state)).toBeNull();
  });

  it("waits for the intro to finish before the first lesson", () => {
    const { tutorial, state, said } = setup();
    tutorial.frame(state, 1, true);
    expect(said()).toHaveLength(0);
    tutorial.frame(state, 0.016, false);
    expect(said()).toEqual(["tutorial.move.say"]);
    expect(tutorial.goal).toBe("move");
  });

  it("teaches move, dash, fight and tokens in order as the player does each one", () => {
    const { tutorial, state, said } = setup();
    open(tutorial, state);
    walk(tutorial, state, MOVE_DISTANCE / 2);
    expect(tutorial.goal).toBe("move");
    expect(tutorial.objective(state)?.progress).toBeCloseTo(0.5, 1);
    walk(tutorial, state, MOVE_DISTANCE / 2 + 40);
    expect(tutorial.goal).toBe("dash");
    tutorial.see(state, [{ kind: "dash" }]);
    expect(tutorial.goal).toBe("fight");
    state.kills += FIGHT_KILLS - 1;
    tutorial.frame(state, 0.016, false);
    expect(tutorial.goal).toBe("fight");
    state.kills += 1;
    tutorial.frame(state, 0.016, false);
    expect(tutorial.goal).toBe("tokens");
    expect(said()).toEqual(["tutorial.move.say", "tutorial.dash.say", "tutorial.fight.say", "tutorial.tokens.say"]);
  });

  it("nags once when the player stands still", () => {
    const { tutorial, state, said } = setup();
    open(tutorial, state);
    for (let second = 0; second < NAG_SECONDS * 3; second += 1) {
      tutorial.frame(state, 1, false);
    }
    expect(said().filter((key) => key === "tutorial.move.nag")).toHaveLength(1);
  });

  it("runs the card lesson on the first level-up, even mid-lesson, then comes back to what was left", () => {
    const { tutorial, state, taught, said } = setup();
    open(tutorial, state);
    state.status = "levelUp";
    tutorial.frame(state, 0.016, false);
    tutorial.frame(state, 0.016, false);
    expect(taught).toHaveLength(1);
    expect(taught[0]?.id).toBe(LESSON_ID);
    expect(taught[0]?.mode).toBe("hold");
    expect(tutorial.goal).toBe("pick");
    state.status = "playing";
    tutorial.frame(state, 0.016, false);
    expect(tutorial.basicsDone).toBe(true);
    expect(tutorial.goal).toBe("move");
    walk(tutorial, state, MOVE_DISTANCE + 40);
    tutorial.see(state, [{ kind: "dash" }]);
    state.kills += FIGHT_KILLS;
    tutorial.frame(state, 0.016, false);
    expect(tutorial.goal).toBe("boss");
    expect(said()).not.toContain("tutorial.tokens.say");
    state.status = "levelUp";
    tutorial.frame(state, 0.016, false);
    expect(taught).toHaveLength(1);
  });

  it("warns before the boss, teaches tells and phases when it lands and finishes when it falls", () => {
    const { tutorial, state, said } = setup();
    open(tutorial, state);
    state.status = "levelUp";
    tutorial.frame(state, 0.016, false);
    state.status = "playing";
    tutorial.frame(state, 0.016, false);
    walk(tutorial, state, MOVE_DISTANCE + 40);
    tutorial.see(state, [{ kind: "dash" }]);
    state.kills += FIGHT_KILLS;
    tutorial.frame(state, 0.016, false);
    expect(tutorial.goal).toBe("boss");
    state.tick = state.nextBossTick - (BOSS_WARNING_SECONDS + 1) * TICKS_PER_SECOND;
    tutorial.frame(state, 0.016, false);
    expect(said()).not.toContain("tutorial.boss.warn");
    state.tick = state.nextBossTick - BOSS_WARNING_SECONDS * TICKS_PER_SECOND;
    tutorial.frame(state, 0.016, false);
    expect(said()).toContain("tutorial.boss.warn");
    tutorial.see(state, [{ kind: "bossArrives", world: 0 }]);
    expect(said()).toContain("tutorial.boss.tells");
    expect(said()).toContain("tutorial.boss.phases");
    tutorial.see(state, [{ kind: "bossDown", world: 0, x: 0, y: 0 }]);
    expect(tutorial.finished).toBe(true);
    expect(tutorial.goal).toBeNull();
    expect(said().at(-1)).toBe("tutorial.finished");
  });

  it("can be skipped at any step", () => {
    const { tutorial, state, said } = setup();
    open(tutorial, state);
    expect(tutorial.skip(state)).toBe(true);
    expect(tutorial.finished).toBe(true);
    expect(tutorial.goal).toBeNull();
    expect(said().at(-1)).toBe("tutorial.skipped");
    expect(tutorial.skip(state)).toBe(false);
  });

  it("spotlights every part of the level-up screen once the lesson names it", () => {
    const spots = pickLesson(words).map((entry) => entry.spot);
    expect(new Set(spots)).toEqual(new Set(["cards", "tags", "loadout", "buttons", "recommended"]));
  });

  it("numbers one step per goal", () => {
    const { tutorial, state } = setup();
    open(tutorial, state);
    expect(tutorial.objective(state)).toMatchObject({ step: 1, count: GOALS.length });
  });

  it("fills every placeholder in every lesson line, in every language", async () => {
    const lesson = pickLesson(words);
    for (const { code } of LOCALES) {
      const messages = await LOADERS[code]();
      for (const { line } of lesson) {
        const template = messages[line.key];
        const filled = template.replace(/\{(\w+)\}/g, (whole, name: string) => String(line.values?.[name] ?? whole));
        expect(filled, `${code} ${line.key}`).not.toMatch(/\{\w+\}/);
      }
    }
    expect(t("tutorial.pick.slots", pickLesson(words)[2]?.line.values)).toContain("5");
  });
});

describe("tutorial in the story", () => {
  it("drops the intro's how-to-play lines when the tutorial teaches them", () => {
    const teaching = introScene("hustlr", true).lines.map((line) => line.key);
    const plain = introScene("hustlr").lines.map((line) => line.key);
    for (const key of HOW_TO_PLAY) {
      expect(plain).toContain(key);
      expect(teaching).not.toContain(key);
    }
  });

  it("lets the card lesson cut in front of a line that is playing on its own", () => {
    const story = new StoryPlayer(memoryOf(), { text: (line) => t(line.key), spaced: () => true });
    const auto: Scene = { id: "tutorial.move", mode: "auto", world: "hustlr", lines: [{ voice: "guide", key: "tutorial.move.say" }], repeat: "always" };
    const lesson: Scene = { id: LESSON_ID, mode: "hold", world: "hustlr", lines: pickLesson(words).map((entry) => entry.line), repeat: "always" };
    story.play(auto);
    story.cut(lesson);
    expect(story.speech?.scene.id).toBe(LESSON_ID);
    expect(story.holding).toBe(true);
  });
});

describe("stale tutorial lines", () => {
  it("drops queued lessons the player has already moved past, but never the card lesson", () => {
    const story = new StoryPlayer(memoryOf(), { text: (line) => t(line.key), spaced: () => true });
    const line = (id: string): Scene => ({ id, mode: "auto", world: "hustlr", lines: [{ voice: "guide", key: "tutorial.move.say" }], repeat: "always" });
    story.play(line("tip.firstChest"));
    story.play(line("tutorial.dash"));
    story.play(line("tutorial.fight"));
    story.play(line("elite.hustlr"));
    story.forget(staleLesson);
    expect(staleLesson(LESSON_ID)).toBe(false);
    const order: string[] = [];
    for (let speech = story.speech; speech; speech = story.speech) {
      order.push(speech.scene.id);
      story.frame(60);
    }
    expect(order).toEqual(["tip.firstChest", "elite.hustlr"]);
  });
});
