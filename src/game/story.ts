import type { MessageKey, Params } from "../i18n";
import type { WorldId } from "../sim/arena/content";
import type { Tier } from "../sim/tiers";

export type Voice = "guide" | "you" | "rival" | "boss";

export type Face = "smile" | "grin" | "serious" | "smirk" | "shocked";

export interface StoryLine {
  readonly voice: Voice;
  readonly key: MessageKey;
  readonly face?: Face;
  readonly values?: Params;
}

export type SceneMode = "hold" | "auto";

export type Repeat = "always" | "once" | "brief";

export interface Scene {
  readonly id: string;
  readonly mode: SceneMode;
  readonly world: WorldId;
  readonly lines: readonly StoryLine[];
  readonly repeat: Repeat;
  readonly brief?: readonly StoryLine[];
}

export interface WorldBeats {
  readonly arrival: readonly StoryLine[];
  readonly elite: StoryLine;
  readonly boss: StoryLine;
  readonly lesson: StoryLine;
}

const guide = (key: MessageKey, face: Face = "smile", values?: Params): StoryLine => (values ? { voice: "guide", key, face, values } : { voice: "guide", key, face });
const you = (key: MessageKey): StoryLine => ({ voice: "you", key });
const rival = (key: MessageKey): StoryLine => ({ voice: "rival", key });
const boss = (key: MessageKey): StoryLine => ({ voice: "boss", key });

export type BossMoment = "bossTaunt" | "bossCheck" | "bossAcquire" | "bossDefeat";

export function bossLine(world: WorldId, moment: BossMoment): StoryLine {
  return boss(`story.${world}.${moment}`);
}

export const GUIDE_COLOR = "#d6b88c";
export const YOU_COLOR = "#73eff7";
export const RIVAL_COLOR = "#ff9b9b";

export const INTRO: readonly StoryLine[] = [
  guide("story.intro.hey", "grin"),
  you("story.intro.rent"),
  guide("story.intro.theirs", "serious"),
  guide("story.intro.name", "smile"),
  guide("story.intro.move", "smirk"),
  guide("story.intro.tokens", "grin"),
];

export const INTRO_AGAIN: readonly StoryLine[] = [guide("story.intro.again", "grin")];

export const WORLD_BEATS: Readonly<Record<WorldId, WorldBeats>> = {
  hustlr: {
    arrival: [rival("story.hustlr.rival"), guide("story.hustlr.arrival", "smirk")],
    elite: guide("story.hustlr.elite", "grin"),
    boss: guide("story.hustlr.boss", "serious"),
    lesson: guide("story.hustlr.lesson", "smile"),
  },
  notionally: {
    arrival: [rival("story.notionally.rival"), guide("story.notionally.arrival", "serious")],
    elite: guide("story.notionally.elite", "smirk"),
    boss: guide("story.notionally.boss", "serious"),
    lesson: guide("story.notionally.lesson", "smile"),
  },
  meterly: {
    arrival: [rival("story.meterly.rival"), guide("story.meterly.arrival", "serious")],
    elite: guide("story.meterly.elite", "grin"),
    boss: guide("story.meterly.boss", "serious"),
    lesson: guide("story.meterly.lesson", "smile"),
  },
  synergex: {
    arrival: [rival("story.synergex.rival"), guide("story.synergex.arrival", "smirk")],
    elite: guide("story.synergex.elite", "smirk"),
    boss: guide("story.synergex.boss", "serious"),
    lesson: guide("story.synergex.lesson", "smile"),
  },
  trustMe: {
    arrival: [rival("story.trustMe.rival"), guide("story.trustMe.arrival", "shocked")],
    elite: guide("story.trustMe.elite", "smirk"),
    boss: guide("story.trustMe.boss", "serious"),
    lesson: guide("story.trustMe.lesson", "smile"),
  },
};

export const TIER_LINES: Readonly<Record<Exclude<Tier, 1>, StoryLine>> = {
  2: guide("story.tier.2", "grin"),
  3: guide("story.tier.3", "grin"),
  4: guide("story.tier.4", "grin"),
  5: guide("story.tier.5", "grin"),
};

export const ENDING: readonly StoryLine[] = [guide("story.ending.look", "smile"), you("story.ending.mine"), guide("story.ending.back", "grin")];

export const HOW_TO_PLAY: readonly MessageKey[] = ["story.intro.move", "story.intro.tokens"];

export function introScene(world: WorldId, teaching = false): Scene {
  const intro = teaching ? INTRO.filter((line) => !HOW_TO_PLAY.includes(line.key)) : INTRO;
  return { id: "intro", mode: "hold", world, lines: [...intro, ...WORLD_BEATS[world].arrival], repeat: teaching ? "always" : "brief", brief: [...INTRO_AGAIN, ...WORLD_BEATS[world].arrival.slice(0, 1)] };
}

export function arrivalScene(world: WorldId): Scene {
  const lines = WORLD_BEATS[world].arrival;
  return { id: `arrival.${world}`, mode: "hold", world, lines, repeat: "brief", brief: lines.slice(0, 1) };
}

export function eliteScene(world: WorldId): Scene {
  return { id: `elite.${world}`, mode: "auto", world, lines: [WORLD_BEATS[world].elite], repeat: "once" };
}

export function bossScene(world: WorldId): Scene {
  const pitch = boss(`world.${world}.pitch`);
  return { id: `boss.${world}`, mode: "hold", world, lines: [pitch, bossLine(world, "bossTaunt"), WORLD_BEATS[world].boss], repeat: "brief", brief: [pitch] };
}

export function payoffScene(world: WorldId): Scene {
  const defeat = bossLine(world, "bossDefeat");
  return { id: `payoff.${world}`, mode: "hold", world, lines: [defeat, you("story.keepMine"), WORLD_BEATS[world].lesson], repeat: "brief", brief: [defeat] };
}

export function endingScene(world: WorldId): Scene {
  return { id: "ending", mode: "hold", world, lines: ENDING, repeat: "always" };
}

export function tierScene(world: WorldId, tier: Tier): Scene | null {
  return tier === 1 ? null : { id: `tier.${tier}`, mode: "auto", world, lines: [TIER_LINES[tier]], repeat: "always" };
}

export function checkScene(world: WorldId, passed: boolean, part: string): Scene {
  const line = passed ? guide("story.check.passed", "grin", { part }) : guide("story.check.failed", "shocked", { part });
  return { id: `check.${world}`, mode: "auto", world, lines: [bossLine(world, "bossCheck"), line], repeat: "always" };
}

export function acquisitionScene(world: WorldId): Scene {
  return { id: `acquire.${world}`, mode: "auto", world, lines: [bossLine(world, "bossAcquire"), guide("story.acquisition", "shocked")], repeat: "always" };
}

export function tipScene(world: WorldId, tip: "lowHealth" | "firstChest" | "firstPick"): Scene {
  const face: Face = tip === "lowHealth" ? "shocked" : "grin";
  return { id: `tip.${tip}`, mode: "auto", world, lines: [guide(`story.tip.${tip}`, face)], repeat: "once" };
}

export function scenePlays(scene: Scene, seen: boolean): readonly StoryLine[] {
  if (!seen || scene.repeat === "always") {
    return scene.lines;
  }
  return scene.repeat === "brief" ? (scene.brief ?? []) : [];
}

export function readingSeconds(text: string, spaced: boolean): number {
  const words = spaced ? text.split(/\s+/).filter((word) => word.length > 0).length / 2 : [...text].length / 4;
  return Math.max(1.5, words) + 1;
}

export const TYPE_CPS = 40;
export const MAX_TYPE_SECONDS = 1.2;

export function typedLength(length: number, seconds: number): number {
  const cps = Math.max(TYPE_CPS, length / MAX_TYPE_SECONDS);
  return Math.min(length, Math.floor(seconds * cps));
}
