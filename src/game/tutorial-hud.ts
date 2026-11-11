import { t, type MessageKey } from "../i18n";
import type { ArenaState } from "../sim/arena/sim";
import { TICKS_PER_SECOND } from "../sim/arena/math";
import { clock } from "./format";
import { cardRects, fitSize, HUD_HEIGHT, HUD_WIDTH, panel, REROLL_RECT, SKIP_RECT, text, type Rect } from "./hud";
import { FIGHT_KILLS, tokenSeconds, type Device, type Goal, type Objective, type Spot } from "./tutorial";

const GOLD = "#ffcd75";
const GUIDE = "#d6b88c";
const INK = "#f4f1e8";
const MUTED = "#9fb0d0";
const DONE = "#a7f070";
const SHADOW = "#10121a";

export const OBJECTIVE_RECT: Rect = { x: 24, y: 122, w: 430, h: 112 };
export const TUTORIAL_SKIP_RECT: Rect = { x: OBJECTIVE_RECT.x + OBJECTIVE_RECT.w - 150, y: OBJECTIVE_RECT.y + 10, w: 138, h: 30 };
export const LESSON_SPEAKER_RECT: Rect = { x: HUD_WIDTH / 2 - 470, y: 34, w: 940, h: 150 };

const GOAL_KEYS: Readonly<Record<Goal, MessageKey>> = {
  move: "tutorial.goal.move",
  dash: "tutorial.goal.dash",
  fight: "tutorial.goal.fight",
  tokens: "tutorial.goal.tokens",
  pick: "tutorial.goal.pick",
  boss: "tutorial.goal.boss",
};

const DEVICE_HINTS: Readonly<Record<"move" | "dash" | "pick", Readonly<Record<Device, MessageKey>>>> = {
  move: { keys: "tutorial.hint.move.keys", touch: "tutorial.hint.move.touch", pad: "tutorial.hint.move.pad" },
  dash: { keys: "tutorial.hint.dash.keys", touch: "tutorial.hint.dash.touch", pad: "tutorial.hint.dash.pad" },
  pick: { keys: "tutorial.hint.pick.keys", touch: "tutorial.hint.pick.touch", pad: "tutorial.hint.pick.pad" },
};

const SKIP_KEYS: Readonly<Record<Device, MessageKey>> = { keys: "tutorial.skip.keys", touch: "tutorial.skip.touch", pad: "tutorial.skip.pad" };

export function goalHint(goal: Goal, device: Device, state: ArenaState): string {
  switch (goal) {
    case "move":
    case "dash":
    case "pick":
      return t(DEVICE_HINTS[goal][device]);
    case "fight":
      return t("tutorial.hint.fight");
    case "tokens":
      return t("tutorial.hint.tokens", { seconds: tokenSeconds() });
    case "boss": {
      if (state.bossId !== null) {
        return t("tutorial.hint.boss.fight");
      }
      const left = Math.max(0, Math.ceil((state.nextBossTick - state.tick) / TICKS_PER_SECOND));
      return t("tutorial.hint.boss.wait", { time: clock(left) });
    }
  }
}

export function goalText(goal: Goal): string {
  return goal === "fight" ? t(GOAL_KEYS[goal], { count: FIGHT_KILLS }) : t(GOAL_KEYS[goal]);
}

function check(context: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  context.strokeStyle = SHADOW;
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(x, y + 9);
  context.lineTo(x + 7, y + 16);
  context.lineTo(x + 20, y);
  context.stroke();
  context.strokeStyle = color;
  context.lineWidth = 4;
  context.stroke();
}

export function drawObjective(context: CanvasRenderingContext2D, objective: Objective, device: Device, state: ArenaState, frame: number): void {
  const rect = OBJECTIVE_RECT;
  const flash = objective.flash;
  context.save();
  panel(context, rect, flash > 0 ? DONE : GUIDE);
  context.fillStyle = GUIDE;
  context.fillRect(rect.x + 3, rect.y + 3, 6, rect.h - 6);
  text(context, t("tutorial.title", { step: objective.step, count: objective.count }), rect.x + 22, rect.y + 16, 15, GOLD);

  const skip = TUTORIAL_SKIP_RECT;
  context.fillStyle = SHADOW;
  context.fillRect(skip.x - 2, skip.y - 2, skip.w + 4, skip.h + 4);
  context.fillStyle = "#20243a";
  context.fillRect(skip.x, skip.y, skip.w, skip.h);
  const skipLabel = t(SKIP_KEYS[device]);
  text(context, skipLabel, skip.x + skip.w / 2, skip.y + 8, fitSize(context, skipLabel, skip.w - 16, 14), INK, "center");

  if (flash > 0 && objective.finished) {
    const finished = goalText(objective.finished);
    check(context, rect.x + 22, rect.y + 50, DONE);
    text(context, finished, rect.x + 54, rect.y + 50, fitSize(context, finished, rect.w - 76, 22), DONE);
  } else {
    const goal = goalText(objective.goal);
    const pulse = 0.75 + 0.25 * Math.sin(frame / 9);
    context.globalAlpha = pulse;
    context.fillStyle = GOLD;
    context.fillRect(rect.x + 22, rect.y + 56, 12, 12);
    context.globalAlpha = 1;
    text(context, goal, rect.x + 46, rect.y + 50, fitSize(context, goal, rect.w - 68, 22), INK);
  }
  const hint = goalHint(objective.goal, device, state);
  text(context, hint, rect.x + 22, rect.y + 84, fitSize(context, hint, rect.w - 44, 15), MUTED);
  if (objective.progress !== null) {
    context.fillStyle = "#2a2f45";
    context.fillRect(rect.x + 12, rect.y + rect.h - 9, rect.w - 24, 4);
    context.fillStyle = GOLD;
    context.fillRect(rect.x + 12, rect.y + rect.h - 9, Math.round((rect.w - 24) * objective.progress), 4);
  }
  context.restore();
}

function grow(rect: Rect, by: number): Rect {
  return { x: rect.x - by, y: rect.y - by, w: rect.w + by * 2, h: rect.h + by * 2 };
}

export function loadoutRect(state: ArenaState): Rect {
  const width = 24 + state.weapons.length * 70 + 12 + state.passives.size * 54;
  return { x: 12, y: HUD_HEIGHT - 98, w: Math.max(140, width), h: 86 };
}

export function spotRects(spot: Spot, state: ArenaState): Rect[] {
  const cards = cardRects(state.cards.length);
  switch (spot) {
    case "cards":
      return cards.map((rect) => grow(rect, 8));
    case "tags":
      return cards.map((rect) => grow({ x: rect.x, y: rect.y, w: rect.w, h: 40 }, 6));
    case "loadout":
      return [loadoutRect(state)];
    case "buttons":
      return [grow(REROLL_RECT, 6), grow(SKIP_RECT, 6)];
    case "recommended": {
      const index = state.cards.findIndex((card) => card.recommended);
      const rect = cards[index];
      return rect ? [grow({ x: rect.x, y: rect.y - 34, w: rect.w, h: rect.h + 34 }, 8)] : cards.map((rect) => grow(rect, 8));
    }
  }
}

export function drawSpotlight(context: CanvasRenderingContext2D, rects: readonly Rect[], frame: number): void {
  context.save();
  context.beginPath();
  context.rect(0, 0, HUD_WIDTH, HUD_HEIGHT);
  for (const rect of rects) {
    context.rect(rect.x, rect.y, rect.w, rect.h);
  }
  context.fillStyle = "rgba(6, 8, 14, 0.66)";
  context.fill("evenodd");
  const glow = 0.55 + 0.45 * Math.sin(frame / 7);
  for (const rect of rects) {
    context.strokeStyle = SHADOW;
    context.lineWidth = 8;
    context.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);
    context.globalAlpha = glow;
    context.strokeStyle = GOLD;
    context.lineWidth = 4;
    context.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);
    context.globalAlpha = 1;
  }
  context.restore();
}
