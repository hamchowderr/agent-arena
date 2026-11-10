import { drawSprite } from "../art/draw";
import { PALETTE } from "../art/palette";
import { agentSprite, rivalSprite } from "../art/sprites";
import type { BattleEvent } from "../sim/battle";
import { banish, pick, reroll, skip, type DraftState } from "../sim/draft";
import { buildAgent } from "../sim/loadout";
import { PARTS } from "../sim/parts";
import { fightAfterDraft, newRun, openDraft, upcomingFight, type FightOutcome, type RunState } from "../sim/run";
import { TIERS, type Tier } from "../sim/tiers";
import { describeBuild, describeEffect, slotLabel } from "./text";

export const WIDTH = 480;
export const HEIGHT = 270;
const TICKS_PER_FRAME = 3;
const RESULT_HOLD_FRAMES = 45;
const FLOAT_FRAMES = 36;
const BACKGROUND = "#0d0f14";

type Screen =
  | { readonly kind: "title" }
  | { readonly kind: "draft"; readonly run: RunState; readonly draft: DraftState; readonly banishing: boolean }
  | { readonly kind: "fight"; readonly before: RunState; readonly outcome: FightOutcome; tick: number; hold: number }
  | { readonly kind: "result"; readonly before: RunState; readonly outcome: FightOutcome };

interface Button {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly enabled: boolean;
  readonly onPress: () => void;
  readonly details?: readonly { readonly text: string; readonly color: string }[];
}

export interface GameHooks {
  readonly newSeed: () => number;
  readonly onTierChange: (tier: Tier) => void;
}

export class Game {
  private screen: Screen = { kind: "title" };
  private buttons: Button[] = [];

  constructor(
    private readonly context: CanvasRenderingContext2D,
    private readonly hooks: GameHooks,
  ) {}

  get state(): string {
    return this.screen.kind;
  }

  frame(): void {
    if (this.screen.kind === "fight") {
      this.advanceFight(this.screen);
    }
    this.render();
  }

  click(x: number, y: number): void {
    const hit = this.buttons.find((button) => button.enabled && x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h);
    hit?.onPress();
  }

  key(key: string): void {
    const lower = key.toLowerCase();
    const byKey = this.buttons.find((button) => button.enabled && button.label.toLowerCase().startsWith(`[${lower}]`));
    byKey?.onPress();
  }

  private startRun(): void {
    const run = newRun(this.hooks.newSeed());
    this.hooks.onTierChange(run.loadout.tier);
    this.screen = { kind: "draft", run, draft: openDraft(run), banishing: false };
  }

  private finishDraft(run: RunState, draft: DraftState): void {
    this.screen = { kind: "fight", before: run, outcome: fightAfterDraft(run, draft), tick: 0, hold: 0 };
  }

  private continueRun(outcome: FightOutcome, before: RunState): void {
    const { run } = outcome;
    if (run.status !== "drafting") {
      this.screen = { kind: "title" };
      return;
    }
    if (run.loadout.tier !== before.loadout.tier) {
      this.hooks.onTierChange(run.loadout.tier);
    }
    this.screen = { kind: "draft", run, draft: openDraft(run), banishing: false };
  }

  private advanceFight(screen: Extract<Screen, { kind: "fight" }>): void {
    if (screen.tick < screen.outcome.battle.ticks) {
      screen.tick = Math.min(screen.outcome.battle.ticks, screen.tick + TICKS_PER_FRAME);
      return;
    }
    screen.hold += 1;
    if (screen.hold >= RESULT_HOLD_FRAMES) {
      this.screen = { kind: "result", before: screen.before, outcome: screen.outcome };
    }
  }

  private render(): void {
    const { context } = this;
    this.buttons = [];
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.textBaseline = "top";
    switch (this.screen.kind) {
      case "title":
        this.renderTitle();
        break;
      case "draft":
        this.renderDraft(this.screen);
        break;
      case "fight":
        this.renderFight(this.screen.outcome, this.screen.tick);
        break;
      case "result":
        this.renderResult(this.screen);
        break;
    }
    for (const button of this.buttons) {
      this.drawButton(button);
    }
  }

  private renderTitle(): void {
    drawSprite(this.context, agentSprite(5), WIDTH / 2 - 48, 30, 6);
    this.text("AGENT ARENA", WIDTH / 2, 132, 16, PALETTE.w, "center");
    this.text("Build an agent you own. Beat the ones they rent you.", WIDTH / 2, 156, 8, PALETTE.s, "center");
    this.buttons.push({ label: "[N] New run", x: WIDTH / 2 - 60, y: 186, w: 120, h: 22, enabled: true, onPress: () => this.startRun() });
  }

  private renderDraft(screen: Extract<Screen, { kind: "draft" }>): void {
    const { run, draft, banishing } = screen;
    const upcoming = upcomingFight(run);
    const tierInfo = TIERS.find((entry) => entry.tier === run.loadout.tier);
    const total = run.stages.reduce((sum, stage) => sum + stage.fights.length, 0);
    this.text(`${tierInfo?.name ?? ""} · ${tierInfo?.stage ?? ""}`, 12, 10, 10, PALETTE.y);
    this.text(`Fight ${upcoming?.number ?? 0} of ${total} · next: ${upcoming?.fight.enemy.name ?? ""}`, 12, 24, 8, PALETTE.s);
    this.text(`Seed ${run.seed}`, WIDTH - 12, 10, 8, PALETTE.S, "right");

    drawSprite(this.context, agentSprite(run.loadout.tier), 12, 40, 4);
    this.text(describeBuild(buildAgent(draft.loadout)), 84, 48, 8, PALETTE.w);
    this.text(`${draft.loadout.parts.length} parts: ${draft.loadout.parts.map((id) => PARTS[id].name).join(", ") || "none yet"}`, 84, 62, 8, PALETTE.s, "left", WIDTH - 96);
    if (upcoming) {
      drawSprite(this.context, rivalSprite(upcoming.fight.boss), WIDTH - 60, 40, 3);
    }

    this.text(banishing ? "Banish which card? It won't come back this run." : "Pick an upgrade", 12, 100, 10, banishing ? PALETTE.r : PALETTE.w);
    draft.offer.forEach((id, index) => {
      const x = 12 + index * 156;
      const part = PARTS[id];
      this.buttons.push({
        label: `[${index + 1}] ${part.name}`,
        x,
        y: 116,
        w: 148,
        h: 86,
        enabled: true,
        onPress: () => {
          if (banishing) {
            this.screen = { ...screen, draft: banish(draft, index), banishing: false };
          } else {
            this.finishDraft(run, pick(draft, index));
          }
        },
        details: [
          { text: slotLabel(part.slot), color: PALETTE.c },
          { text: describeEffect(id), color: PALETTE.l },
        ],
      });
    });
    if (draft.offer.length === 0) {
      this.text("Nothing left to draft. Skip to fight.", 12, 140, 8, PALETTE.s);
    }

    const y = 214;
    this.buttons.push({ label: `[R] Reroll (${draft.rerollsLeft})`, x: 12, y, w: 110, h: 22, enabled: !banishing && draft.rerollsLeft > 0, onPress: () => (this.screen = { ...screen, draft: reroll(draft) }) });
    this.buttons.push({
      label: banishing ? "[B] Cancel" : `[B] Banish (${draft.banishesLeft})`,
      x: 130,
      y,
      w: 110,
      h: 22,
      enabled: banishing || (draft.banishesLeft > 0 && draft.offer.length > 0),
      onPress: () => (this.screen = { ...screen, banishing: !banishing }),
    });
    this.buttons.push({ label: "[S] Skip", x: 248, y, w: 80, h: 22, enabled: !banishing, onPress: () => this.finishDraft(run, skip(draft)) });
  }

  private renderFight(outcome: FightOutcome, tick: number): void {
    const { battle, player, enemy } = outcome;
    const health = [player.maxHealth, enemy.maxHealth];
    const visible = battle.events.filter((event) => event.tick <= tick);
    for (const event of visible) {
      health[event.actor === 0 ? 1 : 0] = event.targetHealthAfter;
    }
    const tier = outcome.run.fights.at(-1)?.tier ?? 1;
    const boss = outcome.run.fights.at(-1)?.boss ?? false;
    const lunge = (actor: 0 | 1) => (visible.some((event) => event.actor === actor && tick - event.tick < 6) ? (actor === 0 ? 8 : -8) : 0);

    this.text(`${player.name} vs ${enemy.name}`, WIDTH / 2, 10, 10, PALETTE.w, "center");
    this.text(`Tick ${tick}`, WIDTH / 2, 26, 8, PALETTE.S, "center");
    drawSprite(this.context, agentSprite(tier), 70 + lunge(0), 90, 5);
    drawSprite(this.context, rivalSprite(boss), 330 + lunge(1), 90, 5, true);
    this.healthBar(40, 44, health[0] ?? 0, player.maxHealth, PALETTE.c);
    this.healthBar(300, 44, health[1] ?? 0, enemy.maxHealth, PALETTE.r);

    for (const event of visible.filter((candidate) => tick - candidate.tick < FLOAT_FRAMES)) {
      this.floatText(event, tick);
    }
    if (tick >= battle.ticks) {
      const won = battle.winner === 0;
      this.text(won ? "YOU WIN" : battle.winner === "draw" ? "DRAW" : "YOU LOSE", WIDTH / 2, 200, 16, won ? PALETTE.l : PALETTE.r, "center");
    }
  }

  private renderResult(screen: Extract<Screen, { kind: "result" }>): void {
    const { outcome, before } = screen;
    const { run, battle } = outcome;
    const won = battle.winner === 0;
    const tiered = run.loadout.tier !== before.loadout.tier;
    const next = TIERS.find((entry) => entry.tier === run.loadout.tier);
    drawSprite(this.context, agentSprite(run.loadout.tier), WIDTH / 2 - 40, 20, 5);
    if (run.status === "cleared") {
      this.text("IPO! Your own agent beat every rented one.", WIDTH / 2, 120, 12, PALETTE.y, "center");
    } else if (!won) {
      this.text(`Run over after ${run.fights.length} fights.`, WIDTH / 2, 120, 12, PALETTE.r, "center");
      this.text(`Seed ${run.seed}`, WIDTH / 2, 140, 8, PALETTE.S, "center");
    } else {
      this.text(`Won in ${battle.ticks} ticks.`, WIDTH / 2, 120, 12, PALETTE.l, "center");
      if (tiered) {
        this.text(`Funded! Your agent is now a ${next?.name ?? ""} (${next?.stage ?? ""}). New slots unlocked.`, WIDTH / 2, 140, 8, PALETTE.y, "center");
      }
    }
    const label = run.status === "drafting" ? "[Enter] Continue" : "[Enter] Back to title";
    this.buttons.push({ label, x: WIDTH / 2 - 75, y: 180, w: 150, h: 22, enabled: true, onPress: () => this.continueRun(outcome, before) });
  }

  private floatText(event: BattleEvent, tick: number): void {
    const age = Math.floor((tick - event.tick) / TICKS_PER_FRAME);
    const targetX = event.actor === 0 ? 370 : 110;
    const actorX = event.actor === 0 ? 110 : 370;
    const y = 86 - Math.floor(age / 2);
    if (event.hallucinated) {
      this.text("??? hallucinated", actorX, y, 8, PALETTE.m, "center");
      return;
    }
    this.text(`${event.crit ? "CRIT " : ""}-${event.damage}`, targetX, y, event.crit ? 12 : 10, event.crit ? PALETTE.y : PALETTE.w, "center");
  }

  private healthBar(x: number, y: number, value: number, max: number, color: string): void {
    this.context.fillStyle = PALETTE.d;
    this.context.fillRect(x, y, 140, 8);
    this.context.fillStyle = color;
    this.context.fillRect(x, y, Math.round((140 * value) / max), 8);
    this.text(`${value}/${max}`, x + 70, y + 12, 8, PALETTE.s, "center");
  }

  private drawButton(button: Button): void {
    const { context } = this;
    context.fillStyle = button.enabled ? PALETTE.d : BACKGROUND;
    context.fillRect(button.x, button.y, button.w, button.h);
    context.strokeStyle = button.enabled ? PALETTE.S : PALETTE.d;
    context.strokeRect(button.x + 0.5, button.y + 0.5, button.w - 1, button.h - 1);
    const tall = button.h > 40;
    this.text(button.label, tall ? button.x + 8 : button.x + button.w / 2, tall ? button.y + 8 : button.y + 7, tall ? 10 : 8, button.enabled ? PALETTE.w : PALETTE.S, tall ? "left" : "center", button.w - 16);
    button.details?.forEach((detail, index) => {
      this.text(detail.text, button.x + 8, button.y + 40 + index * 14, 8, detail.color, "left", button.w - 16);
    });
  }

  private text(value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "left", maxWidth?: number): void {
    const { context } = this;
    context.font = `${size}px ui-monospace, Menlo, Consolas, monospace`;
    context.fillStyle = color;
    context.textAlign = align;
    if (maxWidth === undefined) {
      context.fillText(value, x, y);
      return;
    }
    let line = "";
    let row = 0;
    for (const word of value.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > maxWidth && line) {
        context.fillText(line, x, y + row * (size + 3));
        line = word;
        row += 1;
      } else {
        line = candidate;
      }
    }
    context.fillText(line, x, y + row * (size + 3));
  }
}
