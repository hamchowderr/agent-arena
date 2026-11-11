import { describe, expect, it } from "vitest";
import { guidePortrait, PORTRAIT_FACES, PORTRAIT_SIZE } from "../art/portraits";
import { LOADERS, LOCALES, t, usesSpaces, type MessageKey } from "../i18n";
import { EVOLUTIONS, MERGES, PASSIVES, WEAPONS, WORLDS, type PassiveId, type WeaponId } from "../sim/arena/content";
import { partGuide, passiveName, weaponName } from "./format";
import {
  acquisitionScene,
  arrivalScene,
  checkScene,
  bossScene,
  eliteScene,
  ENDING,
  endingScene,
  INTRO,
  introScene,
  payoffScene,
  readingSeconds,
  scenePlays,
  TIER_LINES,
  tipScene,
  typedLength,
  WORLD_BEATS,
  type Scene,
  type StoryLine,
} from "./story";
import { memoryOf, SCENE_GAP_SECONDS, StoryPlayer } from "./story-player";

const source = { text: (line: StoryLine) => t(line.key, line.values), spaced: () => true };

function player(seen: string[] = []) {
  const memory = memoryOf(seen);
  return { memory, story: new StoryPlayer(memory, source) };
}

function finishLine(story: StoryPlayer): void {
  story.advance();
  story.advance();
}

const everyLine: StoryLine[] = [
  ...INTRO,
  ...ENDING,
  ...Object.values(TIER_LINES),
  ...Object.values(WORLD_BEATS).flatMap((beats) => [...beats.arrival, beats.elite, beats.boss, beats.lesson]),
];

describe("story script", () => {
  it("gives every world an arrival, elite, boss and lesson beat", () => {
    for (const world of WORLDS) {
      const beats = WORLD_BEATS[world.id];
      expect(beats.arrival.length).toBeGreaterThan(0);
      expect(beats.arrival[0]?.voice).toBe("rival");
      expect([beats.elite, beats.boss, beats.lesson].every((line) => line.voice === "guide")).toBe(true);
    }
  });

  it("introduces the guide by name in the opening scene", () => {
    const keys = introScene("hustlr").lines.map((line) => line.key);
    expect(keys).toContain("story.intro.name");
    expect(t("story.intro.name")).toContain(t("story.guideName"));
  });

  it("names the passive each boss checks in the guide's boss hint", () => {
    for (const world of WORLDS) {
      if (world.check.kind === "passive") {
        expect(t(WORLD_BEATS[world.id].boss.key)).toContain(t(`passive.${world.check.passive}.name`));
      }
    }
  });

  it("keeps every story line short enough for the speaker box in every language", async () => {
    for (const { code } of LOCALES) {
      const messages = await LOADERS[code]();
      const limit = usesSpaces(code) ? 140 : 60;
      const long = everyLine.filter((line) => [...messages[line.key]].length > limit).map((line) => line.key);
      expect(long, code).toEqual([]);
    }
  });

  it("keeps the guide's name the same in every language", async () => {
    for (const { code } of LOCALES) {
      const messages = await LOADERS[code]();
      expect(messages["story.intro.name"]).toContain(messages["story.guideName"]);
    }
  });
});

describe("boss voices", () => {
  it("lets every boss speak at its arrival, both phase changes and its defeat", () => {
    for (const world of WORLDS) {
      const scenes = [bossScene(world.id), checkScene(world.id, true, "x"), acquisitionScene(world.id), payoffScene(world.id)];
      for (const scene of scenes) {
        expect(scene.lines.filter((line) => line.voice === "boss").length, scene.id).toBeGreaterThan(0);
      }
      expect(bossScene(world.id).lines.filter((line) => line.voice === "boss").length).toBe(2);
      expect(payoffScene(world.id).lines[0]?.voice).toBe("boss");
    }
  });

  it("gives each boss its own lines", () => {
    const texts = WORLDS.flatMap((world) => [bossScene(world.id), payoffScene(world.id)].flatMap((scene) => scene.lines.filter((line) => line.voice === "boss").map((line) => t(line.key))));
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe("part guide", () => {
  const weaponIds = Object.keys(WEAPONS) as WeaponId[];
  const passiveIds = Object.keys(PASSIVES) as PassiveId[];

  it("explains every weapon and passive in every language, short enough for the strip", async () => {
    for (const { code } of LOCALES) {
      const messages = await LOADERS[code]();
      const limit = usesSpaces(code) ? 230 : 95;
      const keys: MessageKey[] = [...weaponIds.map((id): MessageKey => `weapon.${id}.guide`), ...passiveIds.map((id): MessageKey => `passive.${id}.guide`), "card.restore.guide"];
      const bad = keys.filter((key) => messages[key].trim() === "" || [...messages[key]].length > limit);
      expect(bad, code).toEqual([]);
    }
  });

  it("tells you how every merge is made, from both weapons and the result", () => {
    for (const merge of MERGES) {
      const [first, second] = merge.weapons;
      const result = partGuide({ kind: "evolve", id: merge.result, toLevel: 1, recommended: false, changes: [] });
      expect(partGuide({ kind: "weapon", id: first, toLevel: 1, recommended: false, changes: [] })).toContain(weaponName(second));
      expect(partGuide({ kind: "weapon", id: second, toLevel: 1, recommended: false, changes: [] })).toContain(weaponName(merge.result));
      expect(result).toContain(weaponName(first));
      expect(result).toContain(weaponName(second));
    }
  });

  it("tells you how every evolution is made, from all three sides", () => {
    for (const evolution of EVOLUTIONS) {
      const weapon = partGuide({ kind: "weapon", id: evolution.weapon, toLevel: 1, recommended: false, changes: [] });
      const passive = partGuide({ kind: "passive", id: evolution.passive, toLevel: 1, recommended: false, changes: [] });
      const result = partGuide({ kind: "evolve", id: evolution.result, toLevel: 1, recommended: false, changes: [] });
      expect(weapon).toContain(passiveName(evolution.passive));
      expect(weapon).toContain(weaponName(evolution.result));
      expect(passive).toContain(weaponName(evolution.weapon));
      expect(result).toContain(weaponName(evolution.weapon));
      expect(result).toContain(passiveName(evolution.passive));
    }
  });
});

describe("story player", () => {
  it("holds the run until every line of a new hold scene is read", () => {
    const { story } = player();
    story.play(introScene("hustlr"));
    const lines = introScene("hustlr").lines.length;
    for (let line = 0; line < lines; line += 1) {
      expect(story.holding).toBe(true);
      expect(story.speech?.index).toBe(line);
      finishLine(story);
    }
    expect(story.holding).toBe(false);
    expect(story.busy).toBe(false);
  });

  it("finishes typing on the first press and moves on with the second", () => {
    const { story } = player();
    story.play(introScene("hustlr"));
    story.frame(0.05);
    expect(story.speech?.typing).toBe(true);
    story.advance();
    expect(story.speech?.typing).toBe(false);
    expect(story.speech?.index).toBe(0);
    story.advance();
    expect(story.speech?.index).toBe(1);
  });

  it("types every line within 1.2 seconds, at 40 characters a second or faster", () => {
    expect(typedLength(20, 0.25)).toBe(10);
    expect(typedLength(200, 1.2)).toBe(200);
    expect(typedLength(200, 0.6)).toBe(100);
  });

  it("gives readers 2 words a second, or 4 characters a second without spaces", () => {
    expect(readingSeconds("one two three four five six seven eight", true)).toBe(5);
    expect(readingSeconds("一二三四五六七八九十一二三四五六", false)).toBe(5);
    expect(readingSeconds("hi", true)).toBe(2.5);
  });

  it("skips the rest of a scene and plays the next one", () => {
    const { story } = player();
    story.play(bossScene("hustlr"));
    story.play(payoffScene("hustlr"));
    expect(story.speech?.scene.id).toBe("boss.hustlr");
    story.skip();
    expect(story.speech?.scene.id).toBe("payoff.hustlr");
  });

  it("plays a seen scene as a short line that never holds the run", () => {
    const { story } = player(["boss.hustlr"]);
    story.play(bossScene("hustlr"));
    expect(story.holding).toBe(false);
    expect(story.speech?.count).toBe(1);
    expect(story.speech?.line.voice).toBe("boss");
    story.frame(30);
    expect(story.busy).toBe(false);
  });

  it("drops tips once they've been seen", () => {
    const { story, memory } = player();
    story.play(tipScene("hustlr", "firstChest"));
    expect(memory.has("tip.firstChest")).toBe(true);
    story.frame(30);
    story.play(tipScene("hustlr", "firstChest"));
    expect(story.busy).toBe(false);
  });

  it("closes auto lines on its own after the reading time", () => {
    const { story } = player();
    story.play(tipScene("hustlr", "lowHealth"));
    const text = t("story.tip.lowHealth");
    story.frame(readingSeconds(text, true) - 0.1);
    expect(story.busy).toBe(true);
    story.frame(0.2);
    expect(story.busy).toBe(false);
  });

  it("auto mode reads hold scenes without a press", () => {
    const { story } = player();
    story.toggleAuto();
    story.play(payoffScene("hustlr"));
    story.frame(20);
    expect(story.speech?.index).toBe(1);
    story.frame(20);
    story.frame(20);
    expect(story.busy).toBe(false);
  });

  it("never holds a replay and never marks scenes seen while watching", () => {
    const { story, memory } = player();
    story.play(introScene("hustlr"), true);
    expect(story.busy).toBe(true);
    expect(story.holding).toBe(false);
    expect(memory.has("intro")).toBe(false);
  });

  it("queues each scene once", () => {
    const { story } = player();
    const scenes: Scene[] = [arrivalScene("notionally"), arrivalScene("notionally"), endingScene("trustMe")];
    scenes.forEach((scene) => story.play(scene));
    story.skip();
    expect(story.speech?.scene.id).toBe("ending");
    story.skip();
    expect(story.busy).toBe(false);
  });

  it("leaves a gap of play between two scenes so only one explanation shows at a time", () => {
    const { story } = player();
    story.play(tipScene("hustlr", "firstPick"));
    story.play(eliteScene("hustlr"));
    expect(story.speech?.scene.id).toBe("tip.firstPick");
    story.frame(readingSeconds(t("story.tip.firstPick"), true) + 0.1);
    expect(story.speech).toBeNull();
    expect(story.resting).toBe(true);
    expect(story.holding).toBe(false);
    expect(story.busy).toBe(true);
    story.frame(SCENE_GAP_SECONDS - 0.2);
    expect(story.speech).toBeNull();
    story.frame(0.3);
    expect(story.speech?.scene.id).toBe("elite.hustlr");
  });

  it("waits out the gap before a scene that arrives just after another ends", () => {
    const { story } = player();
    story.play(tipScene("hustlr", "firstChest"));
    story.frame(30);
    story.play(tipScene("hustlr", "lowHealth"));
    expect(story.speech).toBeNull();
    story.frame(SCENE_GAP_SECONDS);
    expect(story.speech?.scene.id).toBe("tip.lowHealth");
  });

  it("lets a lesson cut in without waiting out the gap", () => {
    const { story } = player();
    story.play(tipScene("hustlr", "firstChest"));
    story.frame(30);
    story.cut(payoffScene("hustlr"));
    expect(story.speech?.scene.id).toBe("payoff.hustlr");
  });

  it("gives hold scenes that follow each other a gap of play between them", () => {
    const { story } = player();
    story.play(payoffScene("hustlr"));
    story.play(arrivalScene("notionally"));
    for (let line = 0; line < payoffScene("hustlr").lines.length; line += 1) {
      finishLine(story);
    }
    expect(story.holding).toBe(false);
    expect(story.speech).toBeNull();
    story.frame(SCENE_GAP_SECONDS);
    expect(story.speech?.scene.id).toBe("arrival.notionally");
    expect(story.holding).toBe(true);
  });

  it("brief versions of hold scenes keep the rival's line", () => {
    for (const world of WORLDS) {
      const brief = scenePlays(arrivalScene(world.id), true);
      expect(brief.map((line) => line.voice)).toEqual(["rival"]);
    }
    const keys: MessageKey[] = scenePlays(introScene("hustlr"), true).map((line) => line.key);
    expect(keys).toEqual(["story.intro.again", "story.hustlr.rival"]);
  });
});

describe("guide portrait", () => {
  const looks = PORTRAIT_FACES.flatMap((face) => [false, true].flatMap((talking) => [false, true].map((blink) => ({ face, talking, blink }))));
  const key = (grid: ReturnType<typeof guidePortrait>) => grid.map((row) => row.join()).join("|");

  it("draws every look at the portrait size", () => {
    for (const look of looks) {
      const grid = guidePortrait(look);
      expect(grid.length).toBe(PORTRAIT_SIZE);
      expect(grid.every((row) => row.length === PORTRAIT_SIZE)).toBe(true);
    }
  });

  it("gives every face, talking frame and blink its own drawing", () => {
    expect(new Set(looks.filter((look) => !(look.talking && look.blink)).map((look) => key(guidePortrait(look)))).size).toBe(PORTRAIT_FACES.length * 3);
  });
});
