import { setMusic } from "../audio/music";
import { cueFor } from "../audio/score";
import { Effects } from "../render/effects";
import { ArenaRenderer, RENDER_HEIGHT, RENDER_WIDTH } from "../render/world";
import { WORLDS, type SignatureWave } from "../sim/arena/content";
import type { StagedEvent } from "../sim/arena/formations";
import { SUB, TICKS_PER_SECOND } from "../sim/arena/math";
import { choose, createArena, currentWorld, reroll, skip, step, throttlePercent, type ArenaEvent, type ArenaState, type Input } from "../sim/arena/sim";
import { nextPhase, type RunEvent, type RunPhase } from "../sim/arena/run-loop";
import type { Tier } from "../sim/tiers";
import { currentLocale, nextLocale, setLocale, t, type LocaleCode } from "../i18n";
import type { MessageKey } from "../i18n/locales/en";
import { bossName, bossPitch, passiveName, rivalName, tierStage } from "./format";
import {
  cardRects,
  drawBanner,
  drawBossMarker,
  drawDialogue,
  drawFloats,
  drawLevelUp,
  drawPause,
  drawResults,
  drawRunHud,
  drawTitle,
  HUD_HEIGHT,
  HUD_WIDTH,
  inside,
  REROLL_RECT,
  SKIP_RECT,
  type Banner,
  type Dialogue,
  type FloatText,
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

export interface GameHooks {
  readonly newSeed: () => number;
  readonly now: () => number;
  readonly onScreen: (screen: Screen, state: ArenaState) => void;
  readonly onLocale?: (code: LocaleCode) => void;
}

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
  private hitStop = 0;
  private accumulator = 0;
  private last = 0;
  private frameCount = 0;
  private floats: FloatText[] = [];
  private dialogue: Dialogue | null = null;
  private banner: Banner | null = null;
  private hover = -1;
  private musicOn = false;
  private renderedTier: Tier = 1;
  private twistFloatAt = 0;

  constructor(
    worldCanvas: HTMLCanvasElement,
    private readonly hud: CanvasRenderingContext2D,
    private readonly hooks: GameHooks,
  ) {
    this.renderer = new ArenaRenderer(worldCanvas);
    this.state = createArena(hooks.newSeed());
    this.renderer.setWorld(1, this.state.seed);
  }

  start(seed = this.hooks.newSeed()): void {
    if (!this.allows("start")) {
      return;
    }
    this.state = createArena(seed);
    this.renderer.setWorld(1, seed);
    this.renderedTier = 1;
    this.floats = [];
    this.effects.clear();
    const firstWorld = WORLDS[0];
    this.banner = firstWorld ? { title: rivalName(firstWorld), subtitle: t("story.worldBanner", { world: 1, stage: tierStage(firstWorld.tier) }), age: 0, life: 150 } : null;
    this.dialogue = {
      speaker: t("story.you"),
      line: t("story.opening"),
      color: "#73eff7",
      age: 0,
      life: 260,
    };
    this.setScreen("run");
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
        this.start();
      } else if (lower === "t" && this.allows("toTitle")) {
        this.setScreen("title");
      }
      return;
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
    if (this.state.status === "levelUp") {
      const index = ["1", "2", "3"].indexOf(lower);
      if (index >= 0) {
        choose(this.state, index);
      } else if (lower === "r") {
        reroll(this.state);
      } else if (lower === "x") {
        skip(this.state);
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
      this.start();
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
      choose(this.state, this.hover);
      this.hover = -1;
    } else if (inside(REROLL_RECT, x, y)) {
      reroll(this.state);
    } else if (inside(SKIP_RECT, x, y)) {
      skip(this.state);
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

  private input(): Input {
    const left = this.held.has("a") || this.held.has("arrowleft");
    const right = this.held.has("d") || this.held.has("arrowright");
    const up = this.held.has("w") || this.held.has("arrowup");
    const down = this.held.has("s") || this.held.has("arrowdown");
    const dash = this.dashQueued;
    this.dashQueued = false;
    return { moveX: left === right ? 0 : left ? -1 : 1, moveY: up === down ? 0 : up ? -1 : 1, dash };
  }

  frame(): void {
    const now = this.hooks.now();
    const elapsed = this.last === 0 ? STEP_MS : Math.min(250, now - this.last);
    this.last = now;
    this.frameCount += 1;
    if (this.hitStop > 0 && this.screen === "run") {
      this.hitStop -= 1;
    } else if (this.screen === "run" && this.state.status === "playing") {
      this.accumulator += elapsed;
      let steps = 0;
      while (this.accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME && this.state.status === "playing") {
        step(this.state, this.input());
        this.handle(this.state.events);
        this.accumulator -= STEP_MS;
        steps += 1;
      }
      if (steps === MAX_STEPS_PER_FRAME) {
        this.accumulator = 0;
      }
      if (runOver(this.state)) {
        this.setScreen("results");
      }
    } else {
      this.accumulator = 0;
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
  }

  private handle(events: readonly ArenaEvent[]): void {
    let kills = 0;
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
          if (event.crit) {
            this.effects.spawn("spark", event.x, event.y);
          }
          if (event.boss && event.crit) {
            this.hitStop = Math.max(this.hitStop, 2);
            this.renderer.shake = Math.max(this.renderer.shake, 0.35);
          }
          break;
        case "kill":
          kills += 1;
          if (event.enemy !== "grunt" || kills % 4 === 1) {
            this.effects.spawn("poof", event.x, event.y);
          }
          if (event.enemy === "brute" || event.enemy === "heavy" || event.enemy === "lootRunner") {
            this.hitStop = Math.max(this.hitStop, 2);
            this.renderer.shake = Math.max(this.renderer.shake, 0.3);
          }
          break;
        case "hurt":
          this.renderer.hurt = 1;
          this.renderer.shake = Math.max(this.renderer.shake, 0.7);
          this.hitStop = Math.max(this.hitStop, 3);
          this.floats.push({ text: `-${event.amount}`, x: this.state.player.x, y: this.state.player.y, color: "#ff6b6b", size: 24, age: 0 });
          break;
        case "hallucinated":
          if (this.frameCount % 3 === 0) {
            this.floats.push({ text: "???", x: event.x, y: event.y - 8 * SUB, color: "#d77bba", size: 18, age: 0 });
          }
          break;
        case "pulse":
          this.renderer.pulse(event.x, event.y, event.radius, event.weapon === "ciPipeline" ? "#ffcd75" : "#9ff6ff");
          break;
        case "levelUp":
          this.effects.spawn("burst", this.state.player.x, this.state.player.y);
          break;
        case "bossArrives": {
          const world = WORLDS[event.world];
          if (world) {
            this.banner = { title: bossName(world), subtitle: t("story.bossArrives", { rival: rivalName(world) }), age: 0, life: 170 };
            this.dialogue = { speaker: `${bossName(world)} · ${rivalName(world)}`, line: bossPitch(world), color: "#ff9b9b", age: 0, life: 300 };
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
          this.dialogue = { speaker: t("story.you"), line: t("story.keepMine"), color: "#73eff7", age: 0, life: 220 };
          break;
        }
        case "tierUp":
          break;
        case "slam":
          this.renderer.shake = Math.max(this.renderer.shake, 1.1);
          this.effects.spawn("slam", event.x, event.y);
          break;
        case "dash":
          break;
        case "blast":
          this.renderer.shake = Math.max(this.renderer.shake, 0.6);
          this.renderer.pulse(event.x, event.y, event.radius, "#ef7d57");
          this.effects.spawn("pow", event.x, event.y);
          break;
        case "eliteArrives":
          this.renderer.shake = Math.max(this.renderer.shake, 0.5);
          this.banner = { title: t("elite.arrives"), subtitle: t("elite.subtitle", { rival: rivalName(currentWorld(this.state).id) }), age: 0, life: 150 };
          break;
        case "chest":
          this.hitStop = Math.max(this.hitStop, 4);
          this.effects.spawn("pow", event.x, event.y);
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
      return;
    }
    const paused = this.screen !== "run" || this.state.status !== "playing";
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
    if (this.dialogue) {
      this.dialogue.age += paused ? 0 : 1;
      drawDialogue(context, this.dialogue);
      if (this.dialogue.age > this.dialogue.life) {
        this.dialogue = null;
      }
    }
    if (this.banner) {
      this.banner.age += paused ? 0 : 1;
      drawBanner(context, this.banner);
      if (this.banner.age > this.banner.life) {
        this.banner = null;
      }
    }
    if (this.screen === "run" && this.state.status === "levelUp") {
      drawLevelUp(context, this.state, this.hover);
    }
    if (this.screen === "paused") {
      drawPause(context, this.state);
    }
    if (this.screen === "results") {
      drawResults(context, this.state);
    }
  }
}

export { HUD_HEIGHT, HUD_WIDTH, RENDER_HEIGHT, RENDER_WIDTH };
export { detectLocale } from "../i18n";
