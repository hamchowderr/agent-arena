import { setMusic } from "../audio/music";
import { cueFor } from "../audio/score";
import { Effects } from "../render/effects";
import { ArenaRenderer, RENDER_HEIGHT, RENDER_WIDTH } from "../render/world";
import { WORLDS, type SignatureWave } from "../sim/arena/content";
import type { StagedEvent } from "../sim/arena/formations";
import { SUB, TICKS_PER_SECOND } from "../sim/arena/math";
import { createArena, currentWorld, elapsedSeconds, maxHealth, score, throttlePercent, type ArenaEvent, type ArenaState, type Input } from "../sim/arena/sim";
import { act, decodeReplay, encodeReplay, replayMatches, startRecording, type Action, type Recording, type Replay } from "../sim/arena/replay";
import { nextPhase, type RunEvent, type RunPhase } from "../sim/arena/run-loop";
import type { Tier } from "../sim/tiers";
import { currentLocale, nextLocale, setLocale, t, usesSpaces, type LocaleCode } from "../i18n";
import type { MessageKey } from "../i18n/locales/en";
import { STICK_RADIUS, STILL, stickDirection, stickKnob, type Direction, type Stick } from "./controls";
import { bossName, cardName, clock, partGuide, passiveName, rivalName, tierStage } from "./format";
import { agentCanvas, bossCanvas, guideCanvas } from "./portraits";
import { acquisitionScene, arrivalScene, bossScene, checkScene, eliteScene, endingScene, GUIDE_COLOR, introScene, payoffScene, RIVAL_COLOR, tierScene, tipScene, YOU_COLOR, type StoryLine } from "./story";
import { memoryOf, StoryPlayer, type Speech, type StoryMemory } from "./story-player";
import { replayCode } from "./replay-link";
import {
  cardRects,
  CHEST_HOLD_FRAMES,
  CHEST_SPIN_FRAMES,
  drawBanner,
  drawChestSpin,
  drawBossMarker,
  drawFloats,
  drawLevelUp,
  drawNotice,
  drawPause,
  drawReplayHud,
  drawResults,
  drawRunHud,
  drawSpeaker,
  guideAccent,
  drawTitle,
  HUD_HEIGHT,
  HUD_WIDTH,
  inside,
  POST_RECT,
  REROLL_RECT,
  SHARE_RECT,
  SKIP_RECT,
  WATCH_RECT,
  type Banner,
  type ChestSpin,
  type FloatText,
  type LevelUpGuide,
} from "./hud";

export type Screen = "title" | "run" | "paused" | "results";

const STEP_MS = 1000 / TICKS_PER_SECOND;
const MAX_STEPS_PER_FRAME = 4;
const MAX_FLOATS = 90;
const HUD_PER_RENDER = HUD_WIDTH / RENDER_WIDTH;
const TWIST_FLOAT_EVERY = 45;

const SIGNATURE_TEXT: Readonly<Record<SignatureWave, readonly [MessageKey, MessageKey]>> = {
  viralThread: ["signature.viralThread", "signature.viralThreadLine"],
  inboxZero: ["signature.inboxZero", "signature.inboxZeroLine"],
  canyonToll: ["signature.canyonToll", "signature.canyonTollLine"],
  allHands: ["signature.allHands", "signature.allHandsLine"],
  mirageSchool: ["signature.mirageSchool", "signature.mirageSchoolLine"],
};

const STAGED_TEXT: Readonly<Record<Exclude<StagedEvent, "opening" | "signature">, readonly [MessageKey, MessageKey]>> = {
  wallRing: ["event.wallRing", "event.wallRingLine"],
  swarm: ["event.swarm", "event.swarmLine"],
};
const REPLAY_SPEEDS = [1, 2, 4] as const;
const REPLAY_CARD_HOLD = 50;
const NOTICE_FRAMES = 150;

export type ShareTarget = "sheet" | "x";
export type ShareOutcome = "shared" | "copied" | "opened" | "cancelled" | "failed";

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
}

const LOW_HEALTH_PERCENT = 35;
const BLINK_EVERY = 3.4;
const BLINK_SECONDS = 0.12;
const MOUTH_SECONDS = 0.09;

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
  private ending = false;
  private banner: Banner | null = null;
  private hover = -1;
  private musicOn = false;
  private renderedTier: Tier = 1;
  private twistFloatAt = 0;
  private recording: Recording | null = null;
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
    this.story = new StoryPlayer(hooks.storyMemory ?? memoryOf(), { text: (line) => this.lineText(line), spaced: () => usesSpaces(currentLocale()) });
    this.state = createArena(hooks.newSeed());
    this.renderer.setWorld(1, this.state.seed);
  }

  start(seed = this.hooks.newSeed()): void {
    if (!this.allows("start")) {
      return;
    }
    this.begin(seed, false);
    this.recording = startRecording(seed);
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
    this.begin(replay.seed, true);
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

  private begin(seed: number, watching: boolean): void {
    this.playback = null;
    this.watched = null;
    this.hover = -1;
    this.accumulator = 0;
    this.state = createArena(seed);
    this.renderer.setWorld(1, seed);
    this.renderedTier = 1;
    this.floats = [];
    this.spins = [];
    this.effects.clear();
    const firstWorld = WORLDS[0];
    this.banner = firstWorld ? { title: rivalName(firstWorld), subtitle: t("story.worldBanner", { world: 1, stage: tierStage(firstWorld.tier) }), age: 0, life: 150 } : null;
    this.ending = false;
    this.story.clear();
    if (firstWorld) {
      this.story.play(introScene(firstWorld.id), watching);
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
    return this.recording ? decodeReplay(encodeReplay(this.recording, this.state)) : null;
  }

  private watchAgain(): void {
    const replay = this.lastWatched ?? this.ownReplay();
    if (replay) {
      this.watch(replay);
    }
  }

  private finishRun(): void {
    const playback = this.playback;
    if (playback) {
      this.watched = { mismatch: playback.desynced || !replayMatches(playback.replay, this.state) };
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
    const text = t("share.post", { time: clock(elapsedSeconds(state)), kills: state.kills, score: score(state) });
    void share({ target, seed: state.seed, code, title: t("share.title"), text }).then((outcome) => {
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
      return this.state.status === "levelUp" ? "pausedLevelUp" : "pausedPlaying";
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
    if (lower === "m") {
      this.toggleMusic();
      return;
    }
    if (this.screen === "title") {
      if (lower === "enter" || lower === " ") {
        this.start();
      } else if (lower === "l") {
        void this.changeLocale(nextLocale(currentLocale()));
      }
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
      } else if (lower === "t" && this.allows("toTitle")) {
        this.setScreen("title");
      }
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

  keyUp(key: string): void {
    this.held.delete(key.toLowerCase());
  }

  pointer(x: number, y: number, pressed: boolean): void {
    if (this.screen === "title" && pressed) {
      this.start();
      return;
    }
    if (this.screen === "results" && pressed) {
      if (inside(SHARE_RECT, x, y)) {
        this.share("sheet");
      } else if (inside(POST_RECT, x, y)) {
        this.share("x");
      } else if (inside(WATCH_RECT, x, y)) {
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
    this.hover = cardRects(this.state.cards.length).findIndex((rect) => inside(rect, x, y));
    if (!pressed) {
      return;
    }
    if (this.hover >= 0) {
      this.act({ kind: "choose", index: this.hover });
      this.hover = -1;
    } else if (inside(REROLL_RECT, x, y)) {
      this.act({ kind: "reroll" });
    } else if (inside(SKIP_RECT, x, y)) {
      this.act({ kind: "skip" });
    }
  }

  toggleMusic(): boolean {
    this.musicOn = !this.musicOn;
    this.syncMusic();
    return this.musicOn;
  }

  private syncMusic(): void {
    const { tier, bossesDown, bossId } = this.state;
    setMusic(this.musicOn ? cueFor({ onTitle: this.screen === "title" || this.screen === "results", tier, bossesDown, bossId }) : null);
  }

  wantsStick(): boolean {
    return this.screen === "run" && this.state.status === "playing" && !this.playback && !this.story.holding;
  }

  touchStart(id: number, x: number, y: number): boolean {
    if (!this.wantsStick()) {
      return false;
    }
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
    this.padDirection = direction;
  }

  dash(): void {
    if (this.wantsStick()) {
      this.dashQueued = true;
    }
  }

  nudgeCard(delta: number): void {
    if (this.screen !== "run" || this.state.status !== "levelUp" || this.playback) {
      return;
    }
    const count = this.state.cards.length;
    this.hover = this.hover < 0 ? 0 : (this.hover + delta + count) % count;
  }

  confirm(): void {
    if (this.screen === "run" && this.playback) {
      return;
    }
    if (this.screen === "run" && this.story.holding) {
      this.story.advance();
      return;
    }
    if (this.screen === "run" && this.state.status === "levelUp") {
      this.act({ kind: "choose", index: Math.max(0, this.hover) });
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
    const keys: Direction = { moveX: left === right ? 0 : left ? -1 : 1, moveY: up === down ? 0 : up ? -1 : 1 };
    const touch = this.touch ? stickDirection(this.touch) : STILL;
    const chosen = keys.moveX !== 0 || keys.moveY !== 0 ? keys : touch.moveX !== 0 || touch.moveY !== 0 ? touch : this.padDirection;
    return { ...chosen, dash };
  }

  private drawStick(context: CanvasRenderingContext2D): void {
    if (!this.touch || !this.wantsStick()) {
      return;
    }
    const knob = stickKnob(this.touch);
    context.save();
    context.globalAlpha = 0.35;
    context.fillStyle = "#0d0f14";
    context.beginPath();
    context.arc(this.touch.originX, this.touch.originY, STICK_RADIUS, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 0.6;
    context.strokeStyle = "#f4f1e8";
    context.lineWidth = 4;
    context.stroke();
    context.fillStyle = "#f4f1e8";
    context.beginPath();
    context.arc(knob.x, knob.y, STICK_RADIUS * 0.4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  frame(): void {
    const now = this.hooks.now();
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
    } else if (this.screen === "run" && this.state.status === "playing" && !this.story.holding) {
      this.accumulator += elapsed;
      let steps = 0;
      while (this.accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME && this.state.status === "playing" && this.spins.length === 0 && !this.story.holding) {
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
    if (this.screen === "run" && this.spins.length === 0 && this.state.status !== "levelUp") {
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
    this.renderer.shake = this.renderer.shake < 0.02 ? 0 : this.renderer.shake * 0.86;
    const bossAlive = this.state.bossId !== null;
    this.renderer.letterbox += ((bossAlive ? 0.06 : 0) - this.renderer.letterbox) * 0.1;
    this.renderer.sync(this.state);
    this.renderer.render();
    this.drawHud(elapsed / 1000);
    this.drawStick(this.hud);
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
    while (this.accumulator >= STEP_MS && steps < limit && this.state.status === "playing" && this.spins.length === 0) {
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
    for (const event of events) {
      switch (event.kind) {
        case "damage":
          if (this.floats.length < MAX_FLOATS && (event.crit || this.frameCount % 2 === 0)) {
            this.floats.push({
              text: event.crit ? `${event.amount}!` : String(event.amount),
              x: event.x + ((event.amount * 37) % 7) * SUB,
              y: event.y,
              color: event.crit ? "#ffcd75" : "#f4f1e8",
              size: event.crit ? 26 : 18,
              age: 0,
            });
          }
          this.renderer.spark(event.x, event.y, event.boss);
          if (event.crit) {
            this.effects.spawn("spark", event.x, event.y);
          }
          if (event.boss && event.crit) {
            this.hitStop = Math.max(this.hitStop, 2);
            this.renderer.shake = Math.max(this.renderer.shake, 0.35);
          }
          break;
        case "kill":
          this.renderer.die(event.x, event.y, event.enemy, event.elite, this.state.player.x);
          if (event.enemy === "brute" || event.enemy === "heavy" || event.enemy === "lootRunner") {
            this.hitStop = Math.max(this.hitStop, 2);
            this.renderer.shake = Math.max(this.renderer.shake, 0.3);
          }
          break;
        case "hurt":
          this.renderer.hurt = 1;
          this.renderer.shake = Math.max(this.renderer.shake, 0.7);
          this.hitStop = Math.max(this.hitStop, 3);
          if (this.state.player.health * 100 < maxHealth(this.state) * LOW_HEALTH_PERCENT && this.state.player.health > 0) {
            this.tell(tipScene(currentWorld(this.state).id, "lowHealth"));
          }
          this.floats.push({ text: `-${event.amount}`, x: this.state.player.x, y: this.state.player.y, color: "#ff6b6b", size: 24, age: 0 });
          break;
        case "hallucinated":
          if (this.frameCount % 3 === 0) {
            this.floats.push({ text: "???", x: event.x, y: event.y - 8 * SUB, color: "#d77bba", size: 18, age: 0 });
          }
          break;
        case "pulse":
          this.renderer.pulse(event.x, event.y, event.radius, event.weapon === "ciPipeline" ? "#ffcd75" : "#9ff6ff");
          if (event.weapon === "ciPipeline") {
            this.renderer.pulse(event.x, event.y, Math.trunc(event.radius * 0.6), "#ffffff");
          }
          break;
        case "levelUp":
          this.effects.spawn("burst", this.state.player.x, this.state.player.y);
          this.tell(tipScene(currentWorld(this.state).id, "firstPick"));
          break;
        case "bossArrives": {
          const world = WORLDS[event.world];
          if (world) {
            this.banner = { title: bossName(world), subtitle: t("story.bossArrives", { rival: rivalName(world) }), age: 0, life: 170 };
            this.tell(bossScene(world.id));
          }
          break;
        }
        case "bossPhase": {
          const check = currentWorld(this.state).check;
          const part = check.kind === "passive" ? passiveName(check.passive) : t("boss.checkWeapons");
          this.renderer.shake = Math.max(this.renderer.shake, 0.9);
          this.hitStop = Math.max(this.hitStop, 8);
          const boss = this.state.enemies.find((enemy) => enemy.id === this.state.bossId) ?? this.state.player;
          this.effects.spawn("pow", boss.x, boss.y);
          this.banner =
            event.phase === 2
              ? { title: t("boss.phase2"), subtitle: event.checkPassed ? t("boss.checkPassed", { part }) : t("boss.checkFailed", { part }), age: 0, life: 170 }
              : { title: t("boss.phase3"), subtitle: t("boss.phase3Line"), age: 0, life: 170 };
          const worldId = currentWorld(this.state).id;
          this.tell(event.phase === 2 ? checkScene(worldId, event.checkPassed, part) : acquisitionScene(worldId));
          break;
        }
        case "bossHealed":
          if (this.floats.length < MAX_FLOATS) {
            this.floats.push({ text: `+${event.amount}`, x: event.x, y: event.y, color: "#a7f070", size: 22, age: 0 });
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
          this.banner = { title: t("story.worldCleared"), subtitle: cleared ? t("story.couldNotRent", { rival: rivalName(cleared) }) : "", age: 0, life: 170 };
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
        case "eliteArrives":
          this.renderer.shake = Math.max(this.renderer.shake, 0.5);
          this.banner = { title: t("elite.arrives"), subtitle: t("elite.subtitle", { rival: rivalName(currentWorld(this.state).id) }), age: 0, life: 150 };
          this.tell(eliteScene(currentWorld(this.state).id));
          break;
        case "chest":
          this.effects.spawn("pow", event.x, event.y);
          if (event.prize) {
            this.spins.push({ prize: event.prize, reel: event.reel, age: 0 });
            this.tell(tipScene(currentWorld(this.state).id, "firstChest"));
          }
          if (this.floats.length < MAX_FLOATS) {
            this.floats.push({ text: t("chest.open"), x: event.x, y: event.y, color: "#ffcd75", size: 22, age: 0 });
          }
          break;
        case "lootEscaped":
          break;
        case "staged": {
          const world = WORLDS[event.world];
          if (event.event === "opening" || !world) {
            break;
          }
          const [title, line] = event.event === "signature" ? SIGNATURE_TEXT[world.signature] : STAGED_TEXT[event.event];
          this.renderer.shake = Math.max(this.renderer.shake, 0.4);
          this.banner = { title: t(title), subtitle: t(line), age: 0, life: 160 };
          break;
        }
        case "fakePopped":
          this.effects.spawn("poof", event.x, event.y);
          this.twistFloat("twist.fake", event.x, event.y, "#d77bba");
          break;
        case "blocked":
          this.twistFloat("twist.blocked", event.x, event.y, "#9ff6ff");
          break;
        case "leeched":
          this.twistFloat("twist.leeched", this.state.player.x, this.state.player.y, "#a77ee0");
          break;
        case "rooted":
          this.renderer.shake = Math.max(this.renderer.shake, 0.3);
          this.twistFloat("twist.rooted", this.state.player.x, this.state.player.y, "#2fb5ad");
          break;
        case "metered":
          if (this.floats.length < MAX_FLOATS) {
            this.floats.push({ text: "-1", x: event.x, y: event.y, color: "#e9a93a", size: 20, age: 0 });
          }
          break;
      }
    }
    if (this.state.tick % TICKS_PER_SECOND === 0 && throttlePercent(this.state) > 0) {
      this.twistFloat("twist.throttled", this.state.player.x, this.state.player.y, "#e9a93a");
    }
    this.syncMusic();
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
        const blink = (speech.age + this.state.seed % 7) % BLINK_EVERY < BLINK_SECONDS;
        const talking = speech.typing && Math.floor(speech.age / MOUTH_SECONDS) % 2 === 0;
        return guideCanvas({ face: speech.line.face ?? "smile", talking, blink });
      }
      case "you":
        return agentCanvas(this.state.tier);
      case "rival":
      case "boss":
        return bossCanvas(speech.scene.world);
    }
  }

  private drawStory(): void {
    const speech = this.story.speech;
    if (!speech) {
      return;
    }
    const voice = speech.line.voice;
    drawSpeaker(this.hud, {
      name: this.speakerName(speech),
      color: voice === "guide" ? GUIDE_COLOR : voice === "you" ? YOU_COLOR : RIVAL_COLOR,
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
    });
  }

  private levelUpGuide(): LevelUpGuide | null {
    const cards = this.state.cards;
    const card = cards[this.hover] ?? cards.find((entry) => entry.recommended) ?? cards[0];
    if (!card) {
      return null;
    }
    const blink = Math.floor(this.frameCount / 8) % 26 === 0;
    return {
      name: `${t("story.guideName")} · ${cardName(card)}`,
      text: partGuide(card),
      portrait: guideCanvas({ face: card.kind === "evolve" ? "grin" : "smile", talking: false, blink }),
      accent: guideAccent(card),
    };
  }

  private twistFloat(key: MessageKey, x: number, y: number, color: string): void {
    if (this.floats.length >= MAX_FLOATS || this.frameCount < this.twistFloatAt) {
      return;
    }
    this.twistFloatAt = this.frameCount + TWIST_FLOAT_EVERY;
    this.floats.push({ text: t(key), x, y: y - 10 * SUB, color, size: 20, age: 0 });
  }

  private projectToHud(x: number, y: number): { readonly x: number; readonly y: number } {
    const screen = this.renderer.project(x, y, 0);
    return { x: screen.x * HUD_WIDTH, y: screen.y * HUD_HEIGHT };
  }

  private drawHud(seconds: number): void {
    const context = this.hud;
    context.clearRect(0, 0, HUD_WIDTH, HUD_HEIGHT);
    context.imageSmoothingEnabled = false;
    const project = (x: number, y: number) => this.projectToHud(x, y);
    if (this.screen === "title") {
      drawTitle(context, this.frameCount);
      this.drawNotice();
      return;
    }
    const paused = this.screen !== "run" || this.state.status !== "playing" || this.spins.length > 0;
    this.effects.draw(context, paused ? 0 : seconds, project, HUD_PER_RENDER);
    for (const float of this.floats) {
      float.age += paused ? 0 : 1;
    }
    this.floats = this.floats.filter((float) => float.age < 40);
    drawFloats(context, this.floats, project);
    const player = this.projectToHud(this.state.player.x, this.state.player.y);
    const boss = this.state.enemies.find((enemy) => enemy.id === this.state.bossId);
    drawRunHud(context, this.state, player, boss ? { name: bossName(currentWorld(this.state)), fraction: boss.health / boss.maxHealth } : null);
    if (boss && !paused) {
      drawBossMarker(context, this.projectToHud(boss.x, boss.y), this.frameCount);
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
      drawLevelUp(context, this.state, this.hover, this.levelUpGuide());
    }
    const spinning = this.spins[0];
    if (this.screen === "run" && spinning) {
      drawChestSpin(context, spinning, this.frameCount);
    }
    if (this.playback && this.screen !== "results") {
      drawReplayHud(context, this.playback.speed);
    }
    if (this.screen === "paused") {
      drawPause(context, this.state);
    }
    if (this.screen === "results") {
      drawResults(context, this.state, { replay: this.watched !== null, mismatch: this.watched?.mismatch ?? false, shareReady: this.shareCode !== null && this.hooks.share !== undefined });
    }
    this.drawNotice();
  }

  private drawNotice(): void {
    if (!this.notice) {
      return;
    }
    this.notice.age += 1;
    drawNotice(this.hud, this.notice.text, Math.min(this.notice.age / 8, (NOTICE_FRAMES - this.notice.age) / 20));
    if (this.notice.age > NOTICE_FRAMES) {
      this.notice = null;
    }
  }
}

export { HUD_HEIGHT, HUD_WIDTH, RENDER_HEIGHT, RENDER_WIDTH };
export { postToXUrl, readReplayCode, replayCodeFrom, replayUrl } from "./replay-link";
export { detectLocale } from "../i18n";
