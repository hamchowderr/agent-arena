import { setMusic } from "../audio/music";
import { FRAME_FAILURES_BEFORE_RESET } from "./frame-loop";
import { JOURNAL_EVERY_FRAMES, JOURNAL_KEY, journalEntry } from "./run-journal";
import { cueFor } from "../audio/score";
import { Effects } from "../render/effects";
import { ArenaRenderer } from "../render/world";
import { inPopup, renderSize, setView, toPopup, toStage, view, type View } from "./layout";
import { SHOT_GLOW } from "../art/weapon-art";
import { WORLDS, type SignatureWave } from "../sim/arena/content";
import type { StagedEvent } from "../sim/arena/formations";
import { SUB, TICKS_PER_SECOND } from "../sim/arena/math";
import {
  clampStartWorld,
  createArena,
  currentWorld,
  elapsedSeconds,
  maxHealth,
  score,
  throttlePercent,
  type ArenaEvent,
  type ArenaState,
  type Input,
} from "../sim/arena/sim";
import {
  act,
  decodeReplay,
  encodeReplay,
  replayMatches,
  startRecording,
  type Action,
  type Recording,
  type Replay,
} from "../sim/arena/replay";
import { nextPhase, type RunEvent, type RunPhase } from "../sim/arena/run-loop";
import type { Tier } from "../sim/tiers";
import {
  currentLocale,
  LOCALES,
  nextLocale,
  setLocale,
  t,
  usesSpaces,
  type LocaleCode,
} from "../i18n";
import type { MessageKey } from "../i18n/locales/en";
import {
  STILL,
  stickDirection,
  type Direction,
  type Stick,
} from "./controls";
import {
  bossName,
  cardName,
  clock,
  partGuide,
  passiveName,
  rivalName,
  tierStage,
} from "./format";
import { agentCanvas, bossCanvas, guideCanvas } from "./portraits";
import { DEFAULT_SETTINGS, Menu, MENU_LINKS, parseCleared, parseLoadout, parseSettings, type MenuCommand, type MenuSettings } from "./menu";
import { drawMenu, type MenuDevice } from "./menu-hud";
import {
  acquisitionScene,
  arrivalScene,
  bossScene,
  checkScene,
  eliteScene,
  endingScene,
  GUIDE_COLOR,
  introScene,
  KIT_NUDGES,
  kitNudgeScene,
  payoffScene,
  readingSeconds,
  RIVAL_COLOR,
  tierScene,
  tipScene,
  YOU_COLOR,
  type StoryLine,
} from "./story";
import { CardTour, tourStop, type TourStop } from "./card-tour";
import { blipFor, blipIndices, entranceBoom, type Blip } from "./voice-blips";
import type { Card } from "../sim/arena/cards";
import {
  memoryOf,
  StoryPlayer,
  type Speech,
  type StoryMemory,
} from "./story-player";
import { replayCode } from "./replay-link";
import { LESSON_ID, pickLesson, staleLesson, Tutorial, TUTORIAL_DONE, type Device, type LessonLine } from "./tutorial";
import { drawObjective, drawSpotlight, lessonSpeakerRect, spotRects, tutorialSkipRect } from "./tutorial-hud";
import {
  cardRects,
  CHEST_HOLD_FRAMES,
  CHEST_SPIN_FRAMES,
  drawBanner,
  drawChestSpin,
  drawBossMarker,
  drawFloats,
  drawKitMarker,
  drawLevelUp,
  drawNotice,
  drawPause,
  drawReplayHud,
  drawReplayTag,
  drawResults,
  drawRunHud,
  drawSpeaker,
  drawBossEntrance,
  ENTRANCE_SECONDS,
  ENTRANCE_SLAM_SECONDS,
  guideAccent,
  inside,
  pauseQuitRect,
  postRect,
  rerollRect,
  shareRect,
  skipRect,
  watchRect,
  type Banner,
  type ChestSpin,
  type FloatText,
  type LevelUpGuide,
  type Rect,
} from "./hud";

export type Screen = "title" | "run" | "paused" | "results";

const STEP_MS = 1000 / TICKS_PER_SECOND;
const MAX_STEPS_PER_FRAME = 4;
const MAX_FLOATS = 90;
const TWIST_FLOAT_EVERY = 45;

const SIGNATURE_TEXT: Readonly<
  Record<SignatureWave, readonly [MessageKey, MessageKey]>
> = {
  viralThread: ["signature.viralThread", "signature.viralThreadLine"],
  inboxZero: ["signature.inboxZero", "signature.inboxZeroLine"],
  canyonToll: ["signature.canyonToll", "signature.canyonTollLine"],
  allHands: ["signature.allHands", "signature.allHandsLine"],
  mirageSchool: ["signature.mirageSchool", "signature.mirageSchoolLine"],
};

const STAGED_TEXT: Readonly<
  Record<
    Exclude<StagedEvent, "opening" | "signature">,
    readonly [MessageKey, MessageKey]
  >
> = {
  wallRing: ["event.wallRing", "event.wallRingLine"],
  swarm: ["event.swarm", "event.swarmLine"],
};
const REPLAY_SPEEDS = [1, 2, 4] as const;
const REPLAY_CARD_HOLD = 50;
const NOTICE_FRAMES = 150;

export type ShareTarget = "sheet" | "x";
export type ShareOutcome =
  | "shared"
  | "copied"
  | "opened"
  | "cancelled"
  | "failed";

export interface ShareRequest {
  readonly target: ShareTarget;
  readonly seed: number;
  readonly code: string;
  readonly title: string;
  readonly text: string;
}

interface Playback {
  readonly replay: Replay;
  index: number;
  speed: number;
  hold: number;
  desynced: boolean;
}

export interface GameHooks {
  readonly newSeed: () => number;
  readonly now: () => number;
  readonly onScreen: (screen: Screen, state: ArenaState) => void;
  readonly onLocale?: (code: LocaleCode) => void;
  readonly onReplayCode?: (seed: number, code: string) => void;
  readonly share?: (request: ShareRequest) => Promise<ShareOutcome>;
  readonly storyMemory?: StoryMemory;
  readonly blip?: (blip: Blip) => void;
  readonly saved?: SavedStore;
  readonly openLink?: (url: string) => void;
}

export interface SavedStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
}

export const SETTINGS_KEY = "agent-arena.settings";
export const LOADOUT_KEY = "agent-arena.loadout";
export const CLEARED_KEY = "agent-arena.cleared";

function stepLocale(code: LocaleCode, step: 1 | -1): LocaleCode {
  const index = LOCALES.findIndex((entry) => entry.code === code);
  return LOCALES[(index + step + LOCALES.length) % LOCALES.length]?.code ?? code;
}

const LOW_HEALTH_PERCENT = 35;
const BLINK_EVERY = 3.4;
const BLINK_SECONDS = 0.12;
const MOUTH_SECONDS = 0.09;
const ANGRY_LINE = /\.(bossTaunt|bossCheck|bossAcquire)$/;

function runOver(state: ArenaState): boolean {
  return state.status === "dead" || state.status === "won";
}

export class ArenaGame {
  screen: Screen = "title";
  state: ArenaState;
  private readonly renderer: ArenaRenderer;
  private readonly effects = new Effects();
  private readonly held = new Set<string>();
  private dashQueued = false;
  private padDirection: Direction = STILL;
  private touch: Stick | null = null;
  private hitStop = 0;
  private spins: ChestSpin[] = [];
  private accumulator = 0;
  private last = 0;
  private frameCount = 0;
  private floats: FloatText[] = [];
  private readonly story: StoryPlayer;
  private readonly memory: StoryMemory;
  private tutorial: Tutorial;
  private lesson: readonly LessonLine[] = [];
  private kitNudges = 0;
  private device: Device = "keys";
  private teachNext = false;
  private ending = false;
  private banner: Banner | null = null;
  private hover = -1;
  private voicedLine = "";
  private voicedShown = 0;
  private readonly tour = new CardTour<readonly Card[]>();
  readonly menu: Menu;
  private audioReady = false;
  private mutedMusic = DEFAULT_SETTINGS.music;
  private menuDevice: MenuDevice = "keys";
  private padHeld: Direction = STILL;
  private padRepeat = 0;
  private renderedTier: Tier = 1;
  private twistFloatAt = 0;
  private recording: Recording | null = null;
  private slowestFrameMs = 0;
  private playback: Playback | null = null;
  private watched: { readonly mismatch: boolean } | null = null;
  private shareCode: string | null = null;
  private lastRecording: Recording | null = null;
  private lastWatched: Replay | null = null;
  private notice: { readonly text: string; age: number } | null = null;

  constructor(
    worldCanvas: HTMLCanvasElement,
    private readonly hud: CanvasRenderingContext2D,
    private readonly hooks: GameHooks,
  ) {
    this.renderer = new ArenaRenderer(worldCanvas);
    this.memory = hooks.storyMemory ?? memoryOf();
    this.story = new StoryPlayer(this.memory, { text: (line) => this.lineText(line), spaced: () => usesSpaces(currentLocale()) });
    this.tutorial = this.newTutorial(false);
    this.menu = new Menu(
      parseSettings(hooks.saved?.read(SETTINGS_KEY) ?? null),
      parseCleared(hooks.saved?.read(CLEARED_KEY) ?? null),
      parseLoadout(hooks.saved?.read(LOADOUT_KEY) ?? null),
    );
    this.state = createArena(hooks.newSeed(), this.menu.world);
    this.renderedTier = this.state.tier;
    this.renderer.setWorld(this.state.tier, this.state.seed);
  }

  get settings(): MenuSettings {
    return this.menu.settings;
  }

  start(seed = this.hooks.newSeed(), world = this.menu.world): void {
    if (!this.allows("start")) {
      return;
    }
    this.begin(seed, false, world);
    this.recording = startRecording(seed, this.state.startWorld, this.state.loadout, this.state.kit !== null);
    this.lastRecording = this.recording;
    this.lastWatched = null;
    this.shareCode = null;
    this.setScreen("run");
  }

  watch(replay: Replay, code: string | null = null): void {
    if (!this.allows("start")) {
      return;
    }
    const speed = this.playback?.speed ?? 1;
    this.begin(replay.seed, true, replay.startWorld, replay.loadout, replay.opening);
    this.recording = null;
    this.lastWatched = replay;
    this.playback = { replay, index: 0, speed, hold: 0, desynced: false };
    if (code !== null) {
      this.shareCode = code;
    }
    this.setScreen("run");
  }

  get watching(): boolean {
    return this.playback !== null;
  }

  notify(text: string): void {
    this.notice = { text, age: 0 };
  }

  notifyBrokenReplay(): void {
    this.notify(t("replay.broken"));
  }

  recoverFromFrameError(failures: number): void {
    if (failures >= FRAME_FAILURES_BEFORE_RESET) {
      this.toTitle();
    }
    this.notify(t("error.recovered"));
  }

  private newTutorial(active: boolean): Tutorial {
    return new Tutorial(
      active,
      (scene) => {
        this.story.forget(staleLesson);
        this.tell(scene);
      },
      (scene) => this.story.cut(scene),
      () => {
        this.lesson = pickLesson({
          weapon: t("card.weapon"),
          passive: t("card.passive"),
          fresh: t("card.new"),
          level: t("card.levelChange", { from: 1, to: 2 }),
          evolve: t("card.evolve"),
          recommended: t("card.recommended"),
        });
        return this.lesson;
      },
    );
  }

  get tutorialGoal(): string | null {
    return this.tutorial.goal;
  }

  skipTutorial(): boolean {
    if (this.screen !== "run" || !this.tutorial.skip(this.state)) {
      return false;
    }
    if (this.lessonShowing()) {
      this.story.skip();
    }
    this.memory.add(TUTORIAL_DONE);
    return true;
  }

  private lessonShowing(): boolean {
    return this.story.speech?.scene.id === LESSON_ID;
  }

  private begin(seed: number, watching: boolean, world: number, loadout = this.menu.loadout, opening = !watching): void {
    this.playback = null;
    this.watched = null;
    this.hover = -1;
    this.accumulator = 0;
    const startWorld = clampStartWorld(world);
    this.state = createArena(seed, startWorld, loadout, opening);
    this.renderer.setWorld(this.state.tier, seed);
    this.renderedTier = this.state.tier;
    this.floats = [];
    this.spins = [];
    this.effects.clear();
    const firstWorld = WORLDS[startWorld];
    this.banner = firstWorld
      ? {
          title: rivalName(firstWorld),
          subtitle: t("story.worldBanner", {
            world: startWorld + 1,
            stage: tierStage(firstWorld.tier),
          }),
          age: 0,
          life: 150,
        }
      : null;
    this.ending = false;
    this.story.clear();
    const teaching = !watching && startWorld === 0 && (this.teachNext || !this.memory.has(TUTORIAL_DONE));
    this.teachNext = false;
    this.tutorial = this.newTutorial(teaching);
    this.lesson = [];
    this.kitNudges = 0;
    if (firstWorld) {
      this.story.play(introScene(firstWorld.id, teaching, this.state.kit !== null), watching);
    }
  }

  get storyHolding(): boolean {
    return this.screen === "run" && this.story.holding;
  }

  private lineText(line: StoryLine): string {
    return t(line.key, line.values);
  }

  private endRun(): void {
    if (this.state.status === "dead") {
      this.story.clear();
      this.finishRun();
      return;
    }
    this.ending = true;
  }

  private act(action: Action): boolean {
    return act(this.state, this.recording, action);
  }

  private ownReplay(): Replay | null {
    return this.recording
      ? decodeReplay(encodeReplay(this.recording, this.state))
      : null;
  }

  private watchAgain(): void {
    const replay = this.lastWatched ?? this.ownReplay();
    if (replay) {
      this.watch(replay);
    }
  }

  private saveProgress(): void {
    if (this.playback || this.watched) {
      return;
    }
    const before = this.menu.bossesCleared;
    this.menu.setCleared(this.state.bossesDown);
    if (this.menu.bossesCleared > before) {
      this.hooks.saved?.write(CLEARED_KEY, String(this.menu.bossesCleared));
    }
  }

  private toTitle(): void {
    if (!this.allows("toTitle")) {
      return;
    }
    this.saveProgress();
    this.closeJournal();
    this.playback = null;
    this.recording = null;
    this.story.clear();
    this.tutorial = this.newTutorial(false);
    this.banner = null;
    this.spins = [];
    this.floats = [];
    this.effects.clear();
    this.ending = false;
    this.state = createArena(this.state.seed, this.menu.world);
    this.renderedTier = this.state.tier;
    this.renderer.setWorld(this.state.tier, this.state.seed);
    this.menu.open("home");
    this.setScreen("title");
  }

  private finishRun(): void {
    this.closeJournal();
    this.saveProgress();
    if (this.tutorial.basicsDone || this.tutorial.finished) {
      this.memory.add(TUTORIAL_DONE);
    }
    const playback = this.playback;
    if (playback) {
      this.watched = {
        mismatch:
          playback.desynced || !replayMatches(playback.replay, this.state),
      };
      this.playback = null;
    } else if (this.recording) {
      const recording = this.recording;
      const final = this.state;
      void replayCode(recording, final).then((code) => {
        if (this.lastRecording === recording) {
          this.shareCode = code;
          this.hooks.onReplayCode?.(final.seed, code);
        }
      });
    }
    this.setScreen("results");
  }

  private share(target: ShareTarget): void {
    const code = this.shareCode;
    const share = this.hooks.share;
    if (code === null || !share) {
      return;
    }
    const state = this.state;
    const text = t("share.post", {
      time: clock(elapsedSeconds(state)),
      kills: state.kills,
      score: score(state),
    });
    void share({
      target,
      seed: state.seed,
      code,
      title: t("share.title"),
      text,
    }).then((outcome) => {
      if (outcome === "copied") {
        this.notify(t("share.copied"));
      } else if (outcome === "failed") {
        this.notify(t("share.failed"));
      }
    });
  }

  private playAgain(): void {
    this.start(this.watched ? this.state.seed : this.hooks.newSeed());
  }

  phase(): RunPhase {
    if (this.screen === "title") {
      return "title";
    }
    if (this.screen === "paused") {
      return this.state.status === "levelUp"
        ? "pausedLevelUp"
        : "pausedPlaying";
    }
    return this.state.status;
  }

  private allows(event: RunEvent): boolean {
    return nextPhase(this.phase(), event) !== null;
  }

  async changeLocale(code: LocaleCode): Promise<void> {
    const applied = await setLocale(code);
    this.hooks.onLocale?.(applied);
  }

  private setScreen(screen: Screen): void {
    this.screen = screen;
    this.hooks.onScreen(screen, this.state);
    this.syncMusic();
  }

  keyDown(key: string): void {
    const lower = key.toLowerCase();
    this.held.add(lower);
    this.wakeAudio();
    if (lower === "m") {
      this.toggleMusic();
      return;
    }
    if (this.screen === "title") {
      this.menuDevice = "keys";
      this.titleKey(lower);
      return;
    }
    if (this.screen === "paused" && lower === "q") {
      this.toTitle();
      return;
    }
    if (this.screen === "results") {
      if (lower === "enter") {
        this.playAgain();
      } else if (lower === "s") {
        this.share("sheet");
      } else if (lower === "x") {
        this.share("x");
      } else if (lower === "w") {
        this.watchAgain();
      } else if (lower === "t" || lower === "escape") {
        this.toTitle();
      }
      return;
    }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "shift"].includes(lower)) {
      this.device = "keys";
    }
    if (lower === "tab" && this.skipTutorial()) {
      return;
    }
    if (this.screen === "run" && this.story.holding) {
      if (lower === " " || lower === "enter") {
        this.story.advance();
        return;
      }
      if (lower === "escape") {
        this.story.skip();
        return;
      }
      if (lower === "t") {
        this.story.toggleAuto();
        return;
      }
    }
    if (lower === "p" || lower === "escape") {
      const event = this.screen === "paused" ? "resume" : "pause";
      if (this.allows(event)) {
        this.setScreen(event === "pause" ? "paused" : "run");
      }
      return;
    }
    if (this.screen !== "run") {
      return;
    }
    if (this.playback) {
      if (lower === "f") {
        this.cycleSpeed(this.playback);
      }
      return;
    }
    if (this.state.status === "levelUp") {
      if (this.lessonShowing()) {
        return;
      }
      const index = ["1", "2", "3"].indexOf(lower);
      if (index >= 0) {
        this.act({ kind: "choose", index });
      } else if (lower === "r") {
        this.act({ kind: "reroll" });
      } else if (lower === "x") {
        this.act({ kind: "skip" });
      }
      return;
    }
    if (lower === " " || lower === "shift") {
      this.dashQueued = true;
    }
  }

  private titleKey(key: string): void {
    const moves: Readonly<Record<string, readonly [number, number]>> = {
      arrowup: [0, -1],
      w: [0, -1],
      arrowdown: [0, 1],
      s: [0, 1],
      arrowleft: [-1, 0],
      a: [-1, 0],
      arrowright: [1, 0],
      d: [1, 0],
    };
    const move = moves[key];
    if (move) {
      this.runMenu(this.menu.move(move[0], move[1]));
    } else if (key === "enter" || key === " ") {
      this.runMenu(this.menu.activate());
    } else if (key === "escape" || key === "backspace") {
      this.runMenu(this.menu.back());
    } else if (key === "h") {
      this.runMenu({ kind: "tutorial" });
    } else if (key === "l") {
      void this.changeLocale(nextLocale(currentLocale()));
    }
  }

  private runMenu(command: MenuCommand | null): void {
    if (!command) {
      return;
    }
    switch (command.kind) {
      case "start":
        this.start(this.hooks.newSeed(), command.world);
        return;
      case "tutorial":
        this.teachNext = true;
        this.menu.world = 0;
        this.start(this.hooks.newSeed(), 0);
        return;
      case "locked": {
        const gate = WORLDS[command.world - 1];
        this.notify(t("menu.lockedNotice", { boss: gate ? bossName(gate) : "" }));
        return;
      }
      case "world": {
        const world = WORLDS[command.world];
        if (world) {
          this.state = createArena(this.state.seed, command.world);
          this.renderedTier = this.state.tier;
          this.renderer.setWorld(world.tier, this.state.seed);
        }
        return;
      }
      case "locale":
        void this.changeLocale(stepLocale(currentLocale(), command.step));
        return;
      case "settings":
        this.applySettings(command.settings);
        return;
      case "loadout":
        this.hooks.saved?.write(LOADOUT_KEY, JSON.stringify(command.loadout));
        return;
      case "open":
        this.hooks.openLink?.(MENU_LINKS[command.link]);
        return;
      case "page":
        return;
    }
  }

  private applySettings(settings: MenuSettings): void {
    this.menu.settings = settings;
    this.hooks.saved?.write(SETTINGS_KEY, JSON.stringify(settings));
    this.syncMusic();
  }

  private wakeAudio(): void {
    if (!this.audioReady) {
      this.audioReady = true;
      this.syncMusic();
    }
  }

  back(): void {
    if (this.screen === "title") {
      this.menuDevice = "pad";
      this.runMenu(this.menu.back());
      return;
    }
    this.keyDown("escape");
    this.keyUp("escape");
  }

  keyUp(key: string): void {
    this.held.delete(key.toLowerCase());
  }

  pointer(x: number, y: number, pressed: boolean): void {
    if (pressed) {
      this.wakeAudio();
    }
    const stage = toStage(x, y);
    const popup = toPopup(x, y);
    if (this.screen === "title") {
      if (pressed) {
        this.runMenu(this.menu.click(stage.x, stage.y));
      } else {
        this.menu.hover(stage.x, stage.y);
      }
      return;
    }
    if (this.screen === "paused" && pressed && inside(pauseQuitRect(), popup.x, popup.y)) {
      this.toTitle();
      return;
    }
    if (this.screen === "results" && pressed) {
      if (inside(shareRect(), popup.x, popup.y)) {
        this.share("sheet");
      } else if (inside(postRect(), popup.x, popup.y)) {
        this.share("x");
      } else if (inside(watchRect(), popup.x, popup.y)) {
        this.watchAgain();
      } else {
        this.playAgain();
      }
      return;
    }
    if (this.screen === "run" && this.playback) {
      if (pressed) {
        this.cycleSpeed(this.playback);
      }
      return;
    }
    if (this.screen === "run" && pressed && this.tutorial.goal && inside(tutorialSkipRect(), x, y) && this.skipTutorial()) {
      return;
    }
    if (this.screen === "run" && this.story.holding) {
      if (pressed) {
        this.story.advance();
      }
      return;
    }
    if (this.screen !== "run" || this.state.status !== "levelUp") {
      this.hover = -1;
      return;
    }
    this.hover = cardRects(this.state.cards.length).findIndex((rect) =>
      inside(rect, popup.x, popup.y),
    );
    if (!pressed) {
      return;
    }
    if (this.hover >= 0) {
      this.act({ kind: "choose", index: this.hover });
      this.hover = -1;
    } else if (inside(rerollRect(), popup.x, popup.y)) {
      this.act({ kind: "reroll" });
    } else if (inside(skipRect(), popup.x, popup.y)) {
      this.act({ kind: "skip" });
    }
  }

  toggleMusic(): boolean {
    const music = this.menu.settings.music;
    if (music > 0) {
      this.mutedMusic = music;
    }
    this.applySettings({ ...this.menu.settings, music: music > 0 ? 0 : this.mutedMusic || DEFAULT_SETTINGS.music });
    return this.menu.settings.music > 0;
  }

  private syncMusic(): void {
    const { tier, bossesDown, bossId } = this.state;
    const volume = this.menu.settings.music;
    setMusic(
      this.audioReady && volume > 0
        ? cueFor({
            onTitle: this.screen === "title" || this.screen === "results",
            tier,
            bossesDown,
            bossId,
          })
        : null,
      volume / DEFAULT_SETTINGS.music,
    );
  }

  wantsStick(): boolean {
    return (
      this.screen === "run" &&
      this.state.status === "playing" &&
      !this.playback &&
      !this.story.holding
    );
  }

  preferTouch(): void {
    this.device = "touch";
    this.menuDevice = "touch";
  }

  touchStart(id: number, x: number, y: number): boolean {
    if (!this.wantsStick()) {
      return false;
    }
    this.device = "touch";
    if (this.touch) {
      this.dash();
      return true;
    }
    this.touch = { id, originX: x, originY: y, x, y };
    return true;
  }

  touchMove(id: number, x: number, y: number): void {
    if (this.touch?.id === id) {
      this.touch.x = x;
      this.touch.y = y;
    }
  }

  touchEnd(id: number): void {
    if (this.touch?.id === id) {
      this.touch = null;
    }
  }

  padMove(direction: Direction): void {
    if (direction.moveX !== 0 || direction.moveY !== 0) {
      this.device = "pad";
    }
    this.padDirection = direction;
    if (this.screen !== "title") {
      this.padHeld = STILL;
      return;
    }
    const still = direction.moveX === 0 && direction.moveY === 0;
    const changed = direction.moveX !== this.padHeld.moveX || direction.moveY !== this.padHeld.moveY;
    this.padHeld = direction;
    if (still) {
      return;
    }
    this.padRepeat = changed ? 0 : this.padRepeat + 1;
    if (changed || (this.padRepeat > 24 && this.padRepeat % 8 === 0)) {
      this.menuDevice = "pad";
      this.runMenu(this.menu.move(direction.moveY !== 0 ? 0 : direction.moveX, direction.moveY));
    }
  }

  dash(): void {
    if (this.wantsStick()) {
      this.dashQueued = true;
    }
  }

  nudgeCard(delta: number): void {
    if (
      this.screen !== "run" ||
      this.state.status !== "levelUp" ||
      this.playback
    ) {
      return;
    }
    const count = this.state.cards.length;
    this.hover =
      this.hover < 0
        ? this.shownCard().index
        : (this.hover + delta + count) % count;
  }

  confirm(): void {
    this.device = "pad";
    this.wakeAudio();
    if (this.screen === "title") {
      this.menuDevice = "pad";
      this.runMenu(this.menu.activate());
      return;
    }
    if (this.screen === "run" && this.playback) {
      return;
    }
    if (this.screen === "run" && this.story.holding) {
      this.story.advance();
      return;
    }
    if (this.screen === "run" && this.state.status === "levelUp" && !this.lessonShowing()) {
      this.act({ kind: "choose", index: this.shownCard().index });
      this.hover = -1;
      return;
    }
    if (this.screen === "run") {
      this.dash();
      return;
    }
    this.keyDown("enter");
    this.keyUp("enter");
  }

  private input(): Input {
    const left = this.held.has("a") || this.held.has("arrowleft");
    const right = this.held.has("d") || this.held.has("arrowright");
    const up = this.held.has("w") || this.held.has("arrowup");
    const down = this.held.has("s") || this.held.has("arrowdown");
    const dash = this.dashQueued;
    this.dashQueued = false;
    const keys: Direction = {
      moveX: left === right ? 0 : left ? -1 : 1,
      moveY: up === down ? 0 : up ? -1 : 1,
    };
    const touch = this.touch ? stickDirection(this.touch) : STILL;
    const chosen =
      keys.moveX !== 0 || keys.moveY !== 0
        ? keys
        : touch.moveX !== 0 || touch.moveY !== 0
          ? touch
          : this.padDirection;
    return { ...chosen, dash };
  }

  frame(): void {
    const now = this.hooks.now();
    if (this.last !== 0) {
      this.slowestFrameMs = Math.max(this.slowestFrameMs, now - this.last);
    }
    const elapsed = this.last === 0 ? STEP_MS : Math.min(250, now - this.last);
    this.last = now;
    this.frameCount += 1;
    const spin = this.spins[0];
    if (spin && this.screen === "run") {
      spin.age += this.playback ? this.playback.speed : 1;
      if (spin.age >= CHEST_SPIN_FRAMES + CHEST_HOLD_FRAMES) {
        this.spins.shift();
      }
    } else if (this.hitStop > 0 && this.screen === "run") {
      this.hitStop -= this.playback ? this.playback.speed : 1;
    } else if (this.screen === "run" && this.playback) {
      this.advancePlayback(this.playback, elapsed);
    } else if (
      this.screen === "run" &&
      this.state.status === "playing" &&
      !this.story.holding
    ) {
      this.accumulator += elapsed;
      let steps = 0;
      while (
        this.accumulator >= STEP_MS &&
        steps < MAX_STEPS_PER_FRAME &&
        this.state.status === "playing" &&
        this.spins.length === 0 &&
        !this.story.holding
      ) {
        this.act({ kind: "step", input: this.input() });
        this.handle(this.state.events);
        this.accumulator -= STEP_MS;
        steps += 1;
      }
      if (steps === MAX_STEPS_PER_FRAME) {
        this.accumulator = 0;
      }
      if (runOver(this.state)) {
        this.endRun();
      }
    } else {
      this.accumulator = 0;
    }
    if (this.screen === "run" && this.spins.length === 0 && !this.playback) {
      this.tutorial.frame(this.state, elapsed / 1000, this.story.busy);
      if (this.tutorial.finished) {
        this.memory.add(TUTORIAL_DONE);
      }
    }
    this.nudgeToKit();
    if (this.lessonShowing()) {
      this.tour.hush(this.state.cards);
    } else {
      this.advanceTour(elapsed / 1000);
    }
    if (this.screen === "run" && this.spins.length === 0 && (this.state.status !== "levelUp" || this.lessonShowing())) {
      this.story.frame((elapsed / 1000) * (this.playback?.speed ?? 1));
    }
    if (this.ending && this.screen === "run" && !this.story.busy) {
      this.ending = false;
      this.finishRun();
    }
    if (this.state.tier !== this.renderedTier) {
      this.renderedTier = this.state.tier;
      this.renderer.setWorld(this.state.tier, this.state.seed);
    }
    this.renderer.hurt = Math.max(0, this.renderer.hurt - 0.06);
    this.renderer.shake =
      this.renderer.shake < 0.02 ? 0 : this.renderer.shake * 0.86;
    const bossAlive = this.state.bossId !== null;
    this.renderer.letterbox +=
      ((bossAlive ? 0.06 : 0) - this.renderer.letterbox) * 0.1;
    this.renderer.sync(this.state);
    this.renderer.render();
    this.drawHud(elapsed / 1000);
    this.keepJournal(now);
  }

  private keepJournal(now: number): void {
    if (!this.recording || this.screen !== "run" || this.frameCount % JOURNAL_EVERY_FRAMES !== 0) {
      return;
    }
    this.hooks.saved?.write(JOURNAL_KEY, journalEntry(this.recording, this.state, { screen: this.screen, slowestFrameMs: Math.round(this.slowestFrameMs), savedAt: Math.round(now) }));
    this.slowestFrameMs = 0;
  }

  private closeJournal(): void {
    this.hooks.saved?.write(JOURNAL_KEY, "");
  }

  private cycleSpeed(playback: Playback): void {
    const at = REPLAY_SPEEDS.findIndex((speed) => speed === playback.speed);
    playback.speed = REPLAY_SPEEDS[(at + 1) % REPLAY_SPEEDS.length] ?? 1;
  }

  private advancePlayback(playback: Playback, elapsed: number): void {
    const actions = playback.replay.actions;
    if (this.state.status === "levelUp") {
      const next = actions[playback.index];
      this.hover = next?.kind === "choose" ? next.index : -1;
      playback.hold += playback.speed;
      if (playback.hold < REPLAY_CARD_HOLD) {
        return;
      }
      playback.hold = 0;
      this.hover = -1;
      if (!next) {
        this.finishRun();
        return;
      }
      playback.index += 1;
      playback.desynced ||= !this.act(next);
      return;
    }
    this.accumulator += elapsed * playback.speed;
    const limit = MAX_STEPS_PER_FRAME * playback.speed;
    let steps = 0;
    while (
      this.accumulator >= STEP_MS &&
      steps < limit &&
      this.state.status === "playing" &&
      this.spins.length === 0
    ) {
      const next = actions[playback.index];
      if (!next) {
        this.finishRun();
        return;
      }
      playback.index += 1;
      playback.desynced ||= !this.act(next);
      this.handle(this.state.events);
      this.accumulator -= STEP_MS;
      steps += 1;
    }
    if (steps === limit) {
      this.accumulator = 0;
    }
    if (runOver(this.state)) {
      this.endRun();
    }
  }

  private handle(events: readonly ArenaEvent[]): void {
    this.tutorial.see(this.state, events);
    for (const event of events) {
      switch (event.kind) {
        case "damage":
          if (
            this.floats.length < MAX_FLOATS &&
            (event.crit || this.frameCount % 2 === 0)
          ) {
            this.floats.push({
              text: event.crit ? `${event.amount}!` : String(event.amount),
              x: event.x + ((event.amount * 37) % 7) * SUB,
              y: event.y,
              color: event.crit ? "#ffcd75" : "#f4f1e8",
              size: event.crit ? 26 : 18,
              age: 0,
            });
          }
          this.renderer.spark(event.x, event.y, event.boss, event.weapon);
          if (event.crit) {
            this.effects.spawn("spark", event.x, event.y);
          }
          if (event.boss && event.crit) {
            this.hitStop = Math.max(this.hitStop, 2);
            this.renderer.shake = Math.max(this.renderer.shake, 0.35);
          }
          break;
        case "kill":
          this.renderer.die(
            event.x,
            event.y,
            event.enemy,
            event.elite,
            this.state.player.x,
          );
          if (
            event.enemy === "brute" ||
            event.enemy === "heavy" ||
            event.enemy === "lootRunner"
          ) {
            this.hitStop = Math.max(this.hitStop, 2);
            this.renderer.shake = Math.max(this.renderer.shake, 0.3);
          }
          break;
        case "hurt":
          this.renderer.hurt = 1;
          this.renderer.shake = Math.max(this.renderer.shake, 0.7);
          this.hitStop = Math.max(this.hitStop, 3);
          if (
            this.state.player.health * 100 <
              maxHealth(this.state) * LOW_HEALTH_PERCENT &&
            this.state.player.health > 0
          ) {
            this.tell(tipScene(currentWorld(this.state).id, "lowHealth"));
          }
          this.floats.push({
            text: `-${event.amount}`,
            x: this.state.player.x,
            y: this.state.player.y,
            color: "#ff6b6b",
            size: 24,
            age: 0,
          });
          break;
        case "hallucinated":
          if (this.frameCount % 3 === 0) {
            this.floats.push({
              text: "???",
              x: event.x,
              y: event.y - 8 * SUB,
              color: "#d77bba",
              size: 18,
              age: 0,
            });
          }
          break;
        case "pulse":
          this.renderer.pulse(event.x, event.y, event.radius, SHOT_GLOW[event.weapon]);
          this.renderer.wave(event.weapon, event.x, event.y, event.radius);
          if (event.weapon === "realtimeVoice") {
            this.renderer.pulse(event.x, event.y, Math.trunc(event.radius * 0.6), "#ffcd75");
          }
          break;
        case "interrupted":
          this.renderer.pulse(event.x, event.y, 6 * SUB, "#ffcd75");
          break;
        case "chain":
          this.renderer.tools.chain(event.weapon, event.points);
          break;
        case "mine":
          this.renderer.pulse(event.x, event.y, event.radius, event.weapon === "durableWorkflow" ? "#ffcd75" : "#ef7d57");
          this.renderer.pulse(event.x, event.y, Math.trunc(event.radius * 0.5), "#ffffff");
          if (event.order === 0) {
            this.effects.spawn("pow", event.x, event.y);
          }
          this.renderer.shake = Math.max(this.renderer.shake, 0.22);
          break;
        case "splash":
          this.renderer.pulse(event.x, event.y, event.radius, SHOT_GLOW[event.weapon]);
          break;
        case "reduced":
          this.renderer.pulse(event.x, event.y, event.radius, "#ffcd75");
          this.renderer.pulse(event.x, event.y, Math.trunc(event.radius * 0.6), "#ffffff");
          this.effects.spawn("pow", event.x, event.y);
          this.renderer.shake = Math.max(this.renderer.shake, 0.3);
          break;
        case "levelUp":
          this.effects.spawn("burst", this.state.player.x, this.state.player.y);
          this.tell(tipScene(currentWorld(this.state).id, "firstPick"));
          break;
        case "bossArrives": {
          const world = WORLDS[event.world];
          if (world) {
            this.tell(bossScene(world.id));
          }
          break;
        }
        case "bossPhase": {
          const check = currentWorld(this.state).check;
          const part =
            check.kind === "passive"
              ? passiveName(check.passive)
              : t("boss.checkWeapons");
          this.renderer.shake = Math.max(this.renderer.shake, 0.9);
          this.hitStop = Math.max(this.hitStop, 8);
          const boss =
            this.state.enemies.find(
              (enemy) => enemy.id === this.state.bossId,
            ) ?? this.state.player;
          this.effects.spawn("pow", boss.x, boss.y);
          this.banner =
            event.phase === 2
              ? {
                  title: t("boss.phase2"),
                  subtitle: event.checkPassed
                    ? t("boss.checkPassed", { part })
                    : t("boss.checkFailed", { part }),
                  age: 0,
                  life: 170,
                }
              : {
                  title: t("boss.phase3"),
                  subtitle: t("boss.phase3Line"),
                  age: 0,
                  life: 170,
                };
          const worldId = currentWorld(this.state).id;
          this.tell(
            event.phase === 2
              ? checkScene(worldId, event.checkPassed, part)
              : acquisitionScene(worldId),
          );
          break;
        }
        case "bossHealed":
          if (this.floats.length < MAX_FLOATS) {
            this.floats.push({
              text: `+${event.amount}`,
              x: event.x,
              y: event.y,
              color: "#a7f070",
              size: 22,
              age: 0,
            });
          }
          break;
        case "acquired":
          this.renderer.shake = 2;
          this.renderer.hurt = 1;
          break;
        case "bossDown": {
          this.renderer.shake = 1.6;
          this.hitStop = Math.max(this.hitStop, 14);
          this.effects.spawn("pow", event.x, event.y);
          this.effects.spawn("burst", event.x, event.y);
          const cleared = WORLDS[event.world];
          this.banner = {
            title: t("story.worldCleared"),
            subtitle: cleared
              ? t("story.couldNotRent", { rival: rivalName(cleared) })
              : "",
            age: 0,
            life: 170,
          };
          if (cleared) {
            this.tell(payoffScene(cleared.id));
            const next = WORLDS[event.world + 1];
            const tier = tierScene(cleared.id, this.state.tier);
            if (tier) {
              this.tell(tier);
            }
            this.tell(next ? arrivalScene(next.id) : endingScene(cleared.id));
          }
          break;
        }
        case "tierUp":
          break;
        case "slam":
          this.renderer.shake = Math.max(this.renderer.shake, 1.1);
          this.effects.spawn("slam", event.x, event.y);
          this.renderer.mark(event.x, event.y, "crater");
          break;
        case "dash":
          break;
        case "blast":
          this.renderer.shake = Math.max(this.renderer.shake, 0.6);
          this.renderer.pulse(event.x, event.y, event.radius, "#ef7d57");
          this.effects.spawn("pow", event.x, event.y);
          this.renderer.mark(event.x, event.y, "large");
          break;
        case "kitOpened":
          this.effects.spawn("spark", event.x, event.y);
          this.renderer.shake = Math.max(this.renderer.shake, 0.3);
          this.tell(arrivalScene(currentWorld(this.state).id));
          break;
        case "eliteArrives":
          this.renderer.shake = Math.max(this.renderer.shake, 0.5);
          this.banner = {
            title: t("elite.arrives"),
            subtitle: t("elite.subtitle", {
              rival: rivalName(currentWorld(this.state).id),
            }),
            age: 0,
            life: 150,
          };
          this.tell(eliteScene(currentWorld(this.state).id));
          break;
        case "chest":
          this.effects.spawn("pow", event.x, event.y);
          if (event.prize) {
            this.spins.push({ prize: event.prize, reel: event.reel, age: 0 });
            this.tell(tipScene(currentWorld(this.state).id, "firstChest"));
          }
          if (this.floats.length < MAX_FLOATS) {
            this.floats.push({
              text: t("chest.open"),
              x: event.x,
              y: event.y,
              color: "#ffcd75",
              size: 22,
              age: 0,
            });
          }
          break;
        case "lootEscaped":
          break;
        case "staged": {
          const world = WORLDS[event.world];
          if (event.event === "opening" || !world) {
            break;
          }
          const [title, line] =
            event.event === "signature"
              ? SIGNATURE_TEXT[world.signature]
              : STAGED_TEXT[event.event];
          this.renderer.shake = Math.max(this.renderer.shake, 0.4);
          this.banner = {
            title: t(title),
            subtitle: t(line),
            age: 0,
            life: 160,
          };
          break;
        }
        case "fakePopped":
          this.effects.spawn("poof", event.x, event.y);
          this.twistFloat("twist.fake", event.x, event.y, "#d77bba");
          break;
        case "blocked":
          this.twistFloat("twist.blocked", event.x, event.y, "#9ff6ff");
          break;
        case "deflected":
          this.effects.spawn("spark", event.x, event.y);
          break;
        case "ignite":
          this.renderer.pulse(event.x, event.y, event.radius, "#ef7d57");
          this.effects.spawn("pow", event.x, event.y);
          this.renderer.mark(event.x, event.y, event.weapon === "codeInterpreter" ? "large" : "crater");
          break;
        case "burn":
          this.renderer.pulse(event.x, event.y, event.radius, event.weapon === "codeInterpreter" ? "#ffcd75" : "#b13e53");
          break;
        case "leeched":
          this.twistFloat(
            "twist.leeched",
            this.state.player.x,
            this.state.player.y,
            "#a77ee0",
          );
          break;
        case "rooted":
          this.renderer.shake = Math.max(this.renderer.shake, 0.3);
          this.twistFloat(
            "twist.rooted",
            this.state.player.x,
            this.state.player.y,
            "#2fb5ad",
          );
          break;
        case "metered":
          if (this.floats.length < MAX_FLOATS) {
            this.floats.push({
              text: "-1",
              x: event.x,
              y: event.y,
              color: "#e9a93a",
              size: 20,
              age: 0,
            });
          }
          break;
      }
    }
    if (
      this.state.tick % TICKS_PER_SECOND === 0 &&
      throttlePercent(this.state) > 0
    ) {
      this.twistFloat(
        "twist.throttled",
        this.state.player.x,
        this.state.player.y,
        "#e9a93a",
      );
    }
    this.syncMusic();
  }

  private nudgeToKit(): void {
    if (this.screen !== "run" || this.state.kit === null || this.state.status !== "playing" || this.story.busy) {
      return;
    }
    const due = KIT_NUDGES[this.kitNudges];
    if (due && this.state.heldTicks >= due.afterSeconds * TICKS_PER_SECOND) {
      const scene = kitNudgeScene(currentWorld(this.state).id, this.kitNudges);
      this.kitNudges += 1;
      if (scene) {
        this.tell(scene);
      }
    }
  }

  private tell(scene: Parameters<StoryPlayer["play"]>[0]): void {
    this.story.play(scene, this.playback !== null);
  }

  private speakerName(speech: Speech): string {
    switch (speech.line.voice) {
      case "guide":
        return t("story.guideName");
      case "you":
        return t("story.you");
      case "rival":
        return rivalName(speech.scene.world);
      case "boss":
        return `${bossName(speech.scene.world)} · ${rivalName(speech.scene.world)}`;
    }
  }

  private speakerPortrait(speech: Speech): HTMLCanvasElement {
    switch (speech.line.voice) {
      case "guide": {
        const blink =
          (speech.age + (this.state.seed % 7)) % BLINK_EVERY < BLINK_SECONDS;
        const talking =
          speech.typing && Math.floor(speech.age / MOUTH_SECONDS) % 2 === 0;
        return guideCanvas({
          face: speech.line.face ?? "smile",
          talking,
          blink,
        });
      }
      case "you":
        return agentCanvas(this.state.tier);
      case "rival":
      case "boss": {
        const blink =
          (speech.age + (this.state.seed % 5)) % BLINK_EVERY < BLINK_SECONDS;
        const talking =
          speech.typing && Math.floor(speech.age / MOUTH_SECONDS) % 2 === 0;
        return bossCanvas(speech.scene.world, {
          flicker: blink ? 3 : 0,
          angry: speech.line.voice === "boss" && ANGRY_LINE.test(speech.line.key),
          talking,
        });
      }
    }
  }

  private voice(speech: Speech): void {
    const key = `${speech.scene.id}:${speech.index}`;
    if (key !== this.voicedLine) {
      this.voicedLine = key;
      this.voicedShown = 0;
      if (this.entering(speech)) {
        this.playBlip(entranceBoom(speech.scene.world));
      }
    }
    const chars = [...speech.text];
    const due = blipIndices(speech.text, this.voicedShown, speech.shown);
    this.voicedShown = Math.max(this.voicedShown, speech.shown);
    const last = due[due.length - 1];
    if (last !== undefined && !this.playback) {
      this.playBlip(blipFor(speech.line.voice, speech.scene.world, chars[last] ?? "a"));
    }
  }

  private playBlip(blip: Blip): void {
    const sound = this.menu.settings.sound;
    if (sound > 0) {
      this.hooks.blip?.({ ...blip, gain: (blip.gain * sound) / DEFAULT_SETTINGS.sound });
    }
  }

  private entering(speech: Speech): boolean {
    return speech.scene.id.startsWith("boss.") && speech.index === 0;
  }

  private drawEntrance(speech: Speech): void {
    if (!this.entering(speech) || speech.age >= ENTRANCE_SECONDS) {
      return;
    }
    const slamFrame = speech.age >= ENTRANCE_SLAM_SECONDS && speech.age < ENTRANCE_SLAM_SECONDS + 0.05;
    if (slamFrame) {
      this.renderer.shake = Math.max(this.renderer.shake, 0.5);
    }
    drawBossEntrance(this.hud, {
      label: rivalName(speech.scene.world),
      name: bossName(speech.scene.world),
      company: t("story.bossArrives", { rival: rivalName(speech.scene.world) }),
      portrait: bossCanvas(speech.scene.world),
      age: speech.age,
    });
  }

  private drawStory(rect?: Rect): void {
    const speech = this.story.speech;
    if (!speech) {
      return;
    }
    this.voice(speech);
    this.drawEntrance(speech);
    const voice = speech.line.voice;
    drawSpeaker(this.hud, {
      name: this.speakerName(speech),
      color:
        voice === "guide"
          ? GUIDE_COLOR
          : voice === "you"
            ? YOU_COLOR
            : RIVAL_COLOR,
      portrait: this.speakerPortrait(speech),
      text: speech.text,
      shown: speech.shown,
      hold: speech.mode === "hold",
      typing: speech.typing,
      autoOn: this.story.autoAdvance,
      autoFill: speech.autoFill,
      age: speech.age,
      first: speech.index === 0,
      frame: this.frameCount,
      ...(rect ? { rect } : {}),
    });
  }

  private advanceTour(seconds: number): void {
    const levelUp = this.screen === "run" && this.state.status === "levelUp";
    this.tour.frame(levelUp ? this.state.cards : null, seconds);
  }

  private shownCard(): TourStop {
    if (this.hover >= 0) {
      return { index: this.hover, progress: 0 };
    }
    if (!this.tour.talking) {
      return { index: Math.max(0, this.state.cards.findIndex((card) => card.recommended)), progress: 0 };
    }
    const spaced = usesSpaces(currentLocale());
    return tourStop(
      this.state.cards.map((card) => readingSeconds(partGuide(card), spaced)),
      this.tour.seconds,
    );
  }

  private levelUpGuide(): LevelUpGuide | null {
    if (!this.tour.talking) {
      return null;
    }
    const shown = this.shownCard();
    const card = this.state.cards[shown.index];
    if (!card) {
      return null;
    }
    const blink = Math.floor(this.frameCount / 8) % 26 === 0;
    return {
      name: `${t("story.guideName")} · ${cardName(card)}`,
      text: partGuide(card),
      portrait: guideCanvas({
        face: card.kind === "evolve" ? "grin" : "smile",
        talking: false,
        blink,
      }),
      accent: guideAccent(card),
      progress: shown.progress,
    };
  }

  private twistFloat(
    key: MessageKey,
    x: number,
    y: number,
    color: string,
  ): void {
    if (
      this.floats.length >= MAX_FLOATS ||
      this.frameCount < this.twistFloatAt
    ) {
      return;
    }
    this.twistFloatAt = this.frameCount + TWIST_FLOAT_EVERY;
    this.floats.push({
      text: t(key),
      x,
      y: y - 10 * SUB,
      color,
      size: 20,
      age: 0,
    });
  }

  private projectToHud(
    x: number,
    y: number,
  ): { readonly x: number; readonly y: number } {
    const screen = this.renderer.project(x, y, 0);
    return { x: screen.x * view().width, y: screen.y * view().height };
  }

  resize(next: View): void {
    setView(next);
    const size = renderSize(next);
    this.renderer.resize(size.width, size.height);
  }

  private drawHud(seconds: number): void {
    const context = this.hud;
    context.clearRect(0, 0, view().width, view().height);
    context.imageSmoothingEnabled = false;
    const project = (x: number, y: number) => this.projectToHud(x, y);
    if (this.screen === "title") {
      this.menu.tick();
      drawMenu(context, this.menu, this.frameCount, this.menuDevice);
      this.drawNotice();
      return;
    }
    const paused =
      this.screen !== "run" ||
      this.state.status !== "playing" ||
      this.spins.length > 0;
    this.effects.draw(context, paused ? 0 : seconds, project, view().width / this.renderer.width);
    for (const float of this.floats) {
      float.age += paused ? 0 : 1;
    }
    this.floats = this.floats.filter((float) => float.age < 40);
    drawFloats(context, this.floats, project);
    const kit = this.state.kit;
    if (kit !== null && this.screen === "run") {
      drawKitMarker(context, this.projectToHud(kit.x, kit.y), t("story.crate.label"), this.frameCount, view().width / this.renderer.width);
    }
    const player = this.projectToHud(this.state.player.x, this.state.player.y);
    const boss = this.state.enemies.find(
      (enemy) => enemy.id === this.state.bossId,
    );
    const covered = view().portrait && (paused || this.screen === "results");
    drawRunHud(
      context,
      this.state,
      player,
      boss
        ? {
            name: bossName(currentWorld(this.state)),
            fraction: boss.health / boss.maxHealth,
          }
        : null,
      covered,
    );
    if (boss && !paused) {
      drawBossMarker(
        context,
        this.projectToHud(boss.x, boss.y),
        this.frameCount,
      );
    }
    const objective = this.screen === "results" || this.state.status === "levelUp" ? null : this.tutorial.objective(this.state);
    if (objective) {
      drawObjective(context, objective, this.device, this.state, this.frameCount);
    }
    if (this.spins.length === 0 && this.state.status !== "levelUp" && this.screen !== "results") {
      this.drawStory();
    }
    if (this.banner) {
      this.banner.age += paused ? 0 : 1;
      drawBanner(context, this.banner);
      if (this.banner.age > this.banner.life) {
        this.banner = null;
      }
    }
    if (this.screen === "run" && this.state.status === "levelUp") {
      const state = this.state;
      const hover = this.lessonShowing() ? -1 : this.shownCard().index;
      const guide = this.lessonShowing() ? null : this.levelUpGuide();
      inPopup(context, () => drawLevelUp(context, state, hover, guide));
      const speech = this.story.speech;
      if (speech && this.lessonShowing()) {
        const spot = this.lesson[speech.index]?.spot;
        if (spot) {
          drawSpotlight(context, spotRects(spot, this.state), this.frameCount);
        }
        const lessonRect = lessonSpeakerRect();
        inPopup(context, () => this.drawStory(lessonRect));
      }
    }
    const spinning = this.spins[0];
    if (this.screen === "run" && spinning) {
      const frame = this.frameCount;
      inPopup(context, () => drawChestSpin(context, spinning, frame));
    }
    if (this.playback && this.screen !== "results") {
      drawReplayHud(context, this.playback.speed);
    }
    if (this.screen === "paused") {
      const state = this.state;
      inPopup(context, () => drawPause(context, state));
    }
    if (this.screen === "results") {
      const state = this.state;
      const results = {
        replay: this.watched !== null,
        mismatch: this.watched?.mismatch ?? false,
        shareReady: this.shareCode !== null && this.hooks.share !== undefined,
      };
      inPopup(context, () => drawResults(context, state, results));
      if (results.replay) {
        drawReplayTag(context, t("replay.tag"));
      }
    }
    this.drawNotice();
  }

  private drawNotice(): void {
    if (!this.notice) {
      return;
    }
    this.notice.age += 1;
    drawNotice(
      this.hud,
      this.notice.text,
      Math.min(this.notice.age / 8, (NOTICE_FRAMES - this.notice.age) / 20),
    );
    if (this.notice.age > NOTICE_FRAMES) {
      this.notice = null;
    }
  }
}

export { fitView, hudBacking } from "./layout";
export {
  postToXUrl,
  readReplayCode,
  replayCodeFrom,
  replayUrl,
} from "./replay-link";
export { detectLocale } from "../i18n";
export { playBlip } from "./blip-player";
