import type { MessageKey, Params } from "../i18n";
import { BOSS_EVERY_SECONDS, MAX_PASSIVES, MAX_WEAPONS, type WorldId } from "../sim/arena/content";
import { TICKS_PER_SECOND } from "../sim/arena/math";
import { currentWorld, GEM_LIFE_TICKS, LEVEL_UP_HEAL_PERCENT, PLAYER_SPEED, type ArenaEvent, type ArenaState } from "../sim/arena/sim";
import { clock } from "./format";
import type { Face, Scene, StoryLine } from "./story";

export type Device = "keys" | "touch" | "pad";

export const GOALS = ["move", "pick", "dash", "fight", "tokens", "boss"] as const;
export type Goal = (typeof GOALS)[number];

export type Spot = "cards" | "tags" | "loadout" | "buttons" | "recommended";

export const TUTORIAL_DONE = "tutorial.done";

export function staleLesson(id: string): boolean {
  return id.startsWith("tutorial.") && id !== LESSON_ID;
}
export const LESSON_ID = "tutorial.pick";
export const MOVE_DISTANCE = (PLAYER_SPEED * TICKS_PER_SECOND * 3) / 2;
export const FIGHT_KILLS = 5;
export const NAG_SECONDS = 7;
export const BOSS_WARNING_SECONDS = 15;
const FLASH_SECONDS = 0.9;

const guide = (key: MessageKey, face: Face, values?: Params): StoryLine => (values ? { voice: "guide", key, face, values } : { voice: "guide", key, face });

export interface LessonLine {
  readonly line: StoryLine;
  readonly spot: Spot;
}

export interface CardWords {
  readonly weapon: string;
  readonly passive: string;
  readonly fresh: string;
  readonly level: string;
  readonly evolve: string;
  readonly recommended: string;
}

export function pickLesson(words: CardWords): readonly LessonLine[] {
  return [
    { line: guide("tutorial.pick.cards", "grin"), spot: "cards" },
    { line: guide("tutorial.pick.tags", "smile", { weapon: words.weapon, passive: words.passive, new: words.fresh, level: words.level }), spot: "tags" },
    { line: guide("tutorial.pick.slots", "smile", { weapons: MAX_WEAPONS, passives: MAX_PASSIVES }), spot: "loadout" },
    { line: guide("tutorial.pick.evolve", "serious", { evolve: words.evolve }), spot: "cards" },
    { line: guide("tutorial.pick.buttons", "smirk"), spot: "buttons" },
    { line: guide("tutorial.pick.recommended", "grin", { recommended: words.recommended, percent: LEVEL_UP_HEAL_PERCENT }), spot: "recommended" },
  ];
}

export const GOAL_LINES: Readonly<Record<Exclude<Goal, "pick">, StoryLine>> = {
  move: guide("tutorial.move.say", "smirk"),
  dash: guide("tutorial.dash.say", "grin"),
  fight: guide("tutorial.fight.say", "grin"),
  tokens: guide("tutorial.tokens.say", "smile"),
  boss: guide("tutorial.boss.say", "serious", { time: clock(BOSS_EVERY_SECONDS) }),
};

export const NAG_LINES: Readonly<Partial<Record<Goal, StoryLine>>> = {
  move: guide("tutorial.move.nag", "smirk"),
  dash: guide("tutorial.dash.nag", "smirk"),
};

export const BOSS_WARNING = guide("tutorial.boss.warn", "shocked", { seconds: BOSS_WARNING_SECONDS });
export const BOSS_LESSON: readonly StoryLine[] = [guide("tutorial.boss.tells", "serious"), guide("tutorial.boss.phases", "smirk")];
export const FINISHED = guide("tutorial.finished", "grin");
export const SKIPPED = guide("tutorial.skipped", "smirk");

export function tokenSeconds(): number {
  return Math.round(GEM_LIFE_TICKS / TICKS_PER_SECOND);
}

function say(id: string, world: WorldId, lines: readonly StoryLine[]): Scene {
  return { id: `tutorial.${id}`, mode: "auto", world, lines, repeat: "always" };
}

export interface Objective {
  readonly goal: Goal;
  readonly step: number;
  readonly count: number;
  readonly progress: number | null;
  readonly flash: number;
  readonly finished: Goal | null;
}

export class Tutorial {
  private readonly done = new Set<Goal>();
  private current: Goal | null = null;
  private opened = false;
  private age = 0;
  private nagged = false;
  private last: { x: number; y: number } | null = null;
  private moved = 0;
  private killsAt = 0;
  private warned = false;
  private bossTaught = false;
  private flashAge = FLASH_SECONDS;
  private flashed: Goal | null = null;
  private over = false;
  private kitOpened = false;

  constructor(
    readonly active: boolean,
    private readonly tell: (scene: Scene) => void,
    private readonly teach: (lesson: Scene) => void,
    private readonly lesson: () => readonly LessonLine[],
  ) {}

  get goal(): Goal | null {
    return this.active && !this.over ? this.current : null;
  }

  get basicsDone(): boolean {
    return this.done.has("pick");
  }

  get finished(): boolean {
    return this.over;
  }

  objective(state: ArenaState): Objective | null {
    const goal = this.goal;
    if (!goal) {
      return null;
    }
    return { goal, step: GOALS.indexOf(goal) + 1, count: GOALS.length, progress: this.progress(goal, state), flash: Math.max(0, 1 - this.flashAge / FLASH_SECONDS), finished: this.flashed };
  }

  private progress(goal: Goal, state: ArenaState): number | null {
    switch (goal) {
      case "move":
        return state.kit === null ? Math.min(1, this.moved / MOVE_DISTANCE) : null;
      case "fight":
        return Math.min(1, (state.kills - this.killsAt) / FIGHT_KILLS);
      default:
        return null;
    }
  }

  see(state: ArenaState, events: readonly ArenaEvent[]): void {
    if (!this.active || this.over) {
      return;
    }
    const world = currentWorld(state).id;
    for (const event of events) {
      if (event.kind === "kitOpened") {
        this.kitOpened = true;
      } else if (event.kind === "dash" && this.current === "dash" && this.opened) {
        this.complete(state, "dash");
      } else if (event.kind === "bossArrives" && !this.bossTaught) {
        this.bossTaught = true;
        this.tell(say("boss.lesson", world, BOSS_LESSON));
      } else if (event.kind === "bossDown") {
        this.complete(state, "boss");
      }
    }
  }

  frame(state: ArenaState, seconds: number, storyBusy: boolean): void {
    if (!this.active || this.over) {
      return;
    }
    this.flashAge += seconds;
    if (!this.opened) {
      if (storyBusy) {
        return;
      }
      this.opened = true;
      this.last = { x: state.player.x, y: state.player.y };
      this.go(state, "move");
      return;
    }
    if (state.status === "levelUp" && !this.done.has("pick") && this.current !== "pick") {
      if (this.kitOpened) {
        this.done.add("move");
        this.flashed = "move";
        this.flashAge = 0;
      } else {
        this.done.add("tokens");
      }
      this.go(state, "pick");
      this.teach({ id: LESSON_ID, mode: "hold", world: currentWorld(state).id, lines: this.lesson().map((entry) => entry.line), repeat: "always" });
      return;
    }
    if (state.status === "levelUp" && this.current === "tokens") {
      this.complete(state, "tokens");
      return;
    }
    if (state.status !== "playing") {
      return;
    }
    this.age += seconds;
    const last = this.last;
    if (last) {
      this.moved += Math.hypot(state.player.x - last.x, state.player.y - last.y);
      last.x = state.player.x;
      last.y = state.player.y;
    }
    const nag = this.current ? NAG_LINES[this.current] : undefined;
    if (nag && !this.nagged && this.age > NAG_SECONDS) {
      this.nagged = true;
      this.tell(say(`${this.current}.nag`, currentWorld(state).id, [nag]));
    }
    switch (this.current) {
      case "move":
        if (state.kit === null && this.moved >= MOVE_DISTANCE) {
          this.complete(state, "move");
        }
        break;
      case "fight":
        if (state.kills - this.killsAt >= FIGHT_KILLS) {
          this.complete(state, "fight");
        }
        break;
      case "pick":
        this.complete(state, "pick");
        break;
      case "boss":
        if (!this.warned && state.bossId === null && state.nextBossTick - state.tick <= BOSS_WARNING_SECONDS * TICKS_PER_SECOND) {
          this.warned = true;
          this.tell(say("boss.warn", currentWorld(state).id, [BOSS_WARNING]));
        }
        break;
      default:
        break;
    }
  }

  skip(state: ArenaState): boolean {
    if (!this.goal) {
      return false;
    }
    this.over = true;
    this.tell(say("skipped", currentWorld(state).id, [SKIPPED]));
    return true;
  }

  private complete(state: ArenaState, goal: Goal): void {
    this.done.add(goal);
    this.flashed = goal;
    this.flashAge = 0;
    if (goal === "boss") {
      this.over = true;
      this.tell(say("finished", currentWorld(state).id, [FINISHED]));
      return;
    }
    const next = GOALS.find((candidate) => candidate !== "pick" && !this.done.has(candidate)) ?? "boss";
    this.go(state, next);
  }

  private go(state: ArenaState, goal: Goal): void {
    if (this.current === goal) {
      return;
    }
    this.current = goal;
    this.age = 0;
    this.nagged = false;
    if (goal === "fight") {
      this.killsAt = state.kills;
    }
    if (goal !== "pick") {
      this.tell(say(goal, currentWorld(state).id, [GOAL_LINES[goal]]));
    }
  }
}
