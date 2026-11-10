import { playMusic, stopMusic } from "../audio/music";
import { Effects } from "../render/effects";
import { ArenaRenderer, RENDER_HEIGHT, RENDER_WIDTH } from "../render/world";
import { WORLDS } from "../sim/arena/content";
import { SUB, TICKS_PER_SECOND } from "../sim/arena/math";
import { choose, createArena, currentWorld, reroll, skip, step, type ArenaEvent, type ArenaState, type Input } from "../sim/arena/sim";
import { nextPhase, type RunEvent, type RunPhase } from "../sim/arena/run-loop";
import type { Tier } from "../sim/tiers";
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

export interface GameHooks {
  readonly newSeed: () => number;
  readonly now: () => number;
  readonly onScreen: (screen: Screen, state: ArenaState) => void;
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
    this.banner = { title: WORLDS[0]?.rival ?? "", subtitle: "World 1 · Pre-seed", age: 0, life: 150 };
    this.dialogue = {
      speaker: "You",
      line: "My own agent. Raw, a bit hallucinate-y, but mine. Let's grow it.",
      color: "#73eff7",
      age: 0,
      life: 260,
    };
    this.setScreen("run");
    if (this.musicOn) {
      void playMusic(1);
    }
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

  private setScreen(screen: Screen): void {
    this.screen = screen;
    this.hooks.onScreen(screen, this.state);
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
    void (this.musicOn ? playMusic(this.state.tier) : stopMusic());
    return this.musicOn;
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
          if (event.enemy === "brute") {
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
            this.banner = { title: world.boss, subtitle: `${world.rival} wants you to rent their agent`, age: 0, life: 170 };
            this.dialogue = { speaker: `${world.boss} · ${world.rival}`, line: world.pitch, color: "#ff9b9b", age: 0, life: 300 };
          }
          break;
        }
        case "bossDown":
          this.renderer.shake = 1.6;
          this.hitStop = Math.max(this.hitStop, 14);
          this.effects.spawn("pow", event.x, event.y);
          this.effects.spawn("burst", event.x, event.y);
          this.banner = { title: "World cleared", subtitle: `${WORLDS[event.world]?.rival ?? ""} couldn't rent you anything`, age: 0, life: 170 };
          this.dialogue = { speaker: "You", line: "No thanks. I'll keep my own agent.", color: "#73eff7", age: 0, life: 220 };
          break;
        case "tierUp":
          if (this.musicOn) {
            void playMusic(event.tier);
          }
          break;
        case "slam":
          this.renderer.shake = Math.max(this.renderer.shake, 1.1);
          this.effects.spawn("slam", event.x, event.y);
          break;
        case "dash":
          break;
      }
    }
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
    drawRunHud(context, this.state, player, boss ? { name: currentWorld(this.state).boss, fraction: boss.health / boss.maxHealth } : null);
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
