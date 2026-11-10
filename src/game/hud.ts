import { PASSIVE_ICONS, RESTORE_ICON, WEAPON_ICONS } from "../art/icons";
import type { Sprite } from "../art/sprites";
import type { Card } from "../sim/arena/cards";
import { BOSS_PHASE_FLOORS, isEvolvedWeapon, PASSIVES, WEAPONS, WORLDS, type PassiveId, type WeaponId } from "../sim/arena/content";
import { TICKS_PER_SECOND } from "../sim/arena/math";
import {
  critPercent,
  currentWorld,
  elapsedSeconds,
  hallucinationPercent,
  maxHealth,
  pickupRadius,
  playerSpeed,
  score,
  statTotal,
  xpToNext,
  type ArenaState,
} from "../sim/arena/sim";
import { spriteImage } from "../render/textures";
import { currentLocale, localeName, t, usesSpaces } from "../i18n";
import { cardBlurb, cardName, changeLabel, changeValue, clock, compact, killerName, passiveName, rivalName, tierLabel, weaponName } from "./format";

export const HUD_WIDTH = 1440;
export const HUD_HEIGHT = 810;
const FONT = '"Silkscreen", "DotGothic16", "Press Start 2P", ui-monospace, monospace';
const INK = "#f4f1e8";
const SHADOW = "#10121a";
const GOLD = "#ffcd75";
const PANEL = "rgba(16, 18, 30, 0.86)";
const PANEL_EDGE = "#5d6a8a";
const TILE = "#3a4466";
const TILE_LIGHT = "#56628a";
const WEAPON_ACCENT = "#41a6f6";
const PASSIVE_ACCENT = "#a7f070";
const RESTORE_ACCENT = "#38b764";
const CARD_FACE = "#20243a";
const CARD_INSET = "#151827";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface FloatText {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly size: number;
  age: number;
}

export interface Dialogue {
  readonly speaker: string;
  readonly line: string;
  readonly color: string;
  age: number;
  readonly life: number;
}

export interface Banner {
  readonly title: string;
  readonly subtitle: string;
  age: number;
  readonly life: number;
}

export interface ChestSpin {
  readonly prize: Card;
  readonly reel: readonly Card[];
  age: number;
}

export const CHEST_SPIN_FRAMES = 84;
export const CHEST_HOLD_FRAMES = 54;
const REEL_SLOTS = 18;
const REEL_SLOT_HEIGHT = 132;

const iconCache = new Map<string, HTMLCanvasElement>();

function cachedIcon(key: string, sprite: Sprite): HTMLCanvasElement {
  let icon = iconCache.get(key);
  if (!icon) {
    icon = spriteImage([sprite]).canvas;
    iconCache.set(key, icon);
  }
  return icon;
}

function weaponIcon(id: WeaponId): HTMLCanvasElement {
  return cachedIcon(`weapon.${id}`, WEAPON_ICONS[id]);
}

function passiveIcon(id: PassiveId): HTMLCanvasElement {
  return cachedIcon(`passive.${id}`, PASSIVE_ICONS[id]);
}

function drawIcon(context: CanvasRenderingContext2D, icon: HTMLCanvasElement, centerX: number, centerY: number, size: number): void {
  const scale = Math.max(1, Math.floor(size / Math.max(icon.width, icon.height)));
  context.imageSmoothingEnabled = false;
  context.drawImage(icon, Math.round(centerX - (icon.width * scale) / 2), Math.round(centerY - (icon.height * scale) / 2), icon.width * scale, icon.height * scale);
}

function iconTile(context: CanvasRenderingContext2D, rect: Rect, accent: string): void {
  context.fillStyle = SHADOW;
  context.fillRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
  context.fillStyle = TILE;
  context.fillRect(rect.x, rect.y, rect.w, rect.h);
  context.fillStyle = TILE_LIGHT;
  context.fillRect(rect.x, rect.y, rect.w, 4);
  context.fillStyle = accent;
  context.fillRect(rect.x, rect.y + rect.h - 4, rect.w, 4);
}

export function text(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color = INK,
  align: CanvasTextAlign = "left",
): void {
  context.font = `${size}px ${FONT}`;
  context.textAlign = align;
  context.textBaseline = "top";
  context.fillStyle = SHADOW;
  context.fillText(value, x + Math.max(2, size / 8), y + Math.max(2, size / 8));
  context.fillStyle = color;
  context.fillText(value, x, y);
}

function panel(context: CanvasRenderingContext2D, rect: Rect, edge = PANEL_EDGE): void {
  context.fillStyle = PANEL;
  context.fillRect(rect.x, rect.y, rect.w, rect.h);
  context.strokeStyle = edge;
  context.lineWidth = 3;
  context.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3);
}

function bar(context: CanvasRenderingContext2D, rect: Rect, fraction: number, fill: string, back = "#2a2f45"): void {
  context.fillStyle = SHADOW;
  context.fillRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
  context.fillStyle = back;
  context.fillRect(rect.x, rect.y, rect.w, rect.h);
  context.fillStyle = fill;
  context.fillRect(rect.x, rect.y, Math.round(rect.w * Math.max(0, Math.min(1, fraction))), rect.h);
}

function measure(context: CanvasRenderingContext2D, value: string, size: number): number {
  context.font = `${size}px ${FONT}`;
  return context.measureText(value).width;
}

function fitSize(context: CanvasRenderingContext2D, value: string, width: number, size: number): number {
  let fitted = size;
  while (fitted > 10 && measure(context, value, fitted) > width) {
    fitted -= 1;
  }
  return fitted;
}

export function wrapTokens(value: string, spaced: boolean): string[] {
  if (spaced) {
    return value.split(" ").filter(Boolean);
  }
  return [...value];
}

export function wrapLines(value: string, width: number, spaced: boolean, measureWidth: (line: string) => number): string[] {
  const joiner = spaced ? " " : "";
  const lines: string[] = [];
  let line = "";
  for (const token of wrapTokens(value, spaced)) {
    const candidate = line ? `${line}${joiner}${token}` : token;
    if (measureWidth(candidate) > width && line) {
      lines.push(line);
      line = token;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

function wrap(context: CanvasRenderingContext2D, value: string, width: number, size: number): string[] {
  context.font = `${size}px ${FONT}`;
  return wrapLines(value, width, usesSpaces(currentLocale()), (line) => context.measureText(line).width);
}

export function drawRunHud(
  context: CanvasRenderingContext2D,
  state: ArenaState,
  player: { readonly x: number; readonly y: number },
  boss: { readonly name: string; readonly fraction: number } | null,
): void {
  const xpFraction = state.xp / xpToNext(state.level);
  bar(context, { x: 0, y: 0, w: HUD_WIDTH, h: 10 }, xpFraction, "#73eff7", "#1a2033");

  text(context, t("hud.level", { level: state.level }), 24, 26, 30, GOLD);
  text(context, tierLabel(state.tier), 24, 64, 18);
  text(context, t("hud.world", { world: Math.min(state.bossesDown + 1, WORLDS.length), rival: rivalName(currentWorld(state)) }), 24, 90, 16, "#9fb0d0");

  text(context, clock(elapsedSeconds(state)), HUD_WIDTH / 2, 22, 40, INK, "center");
  if (boss) {
    text(context, boss.name, HUD_WIDTH / 2, 74, 18, "#ff9b9b", "center");
    const barRect = { x: HUD_WIDTH / 2 - 260, y: 100, w: 520, h: 16 };
    bar(context, barRect, boss.fraction, "#e43b44");
    context.fillStyle = "#1a1c2c";
    for (const floor of BOSS_PHASE_FLOORS) {
      if (floor > 0) {
        context.fillRect(barRect.x + (barRect.w * floor) / 100 - 2, barRect.y - 4, 4, barRect.h + 8);
      }
    }
    const fight = state.fight;
    if (fight && fight.phase === 3) {
      const seconds = Math.ceil(fight.acquireTicks / TICKS_PER_SECOND);
      const urgent = seconds <= 10 && Math.floor(fight.acquireTicks / 15) % 2 === 0;
      text(context, t("boss.acquire", { time: clock(seconds) }), HUD_WIDTH / 2, 128, 18, urgent ? "#ff4b5c" : GOLD, "center");
    }
  }

  text(context, t("hud.score", { score: compact(score(state)) }), HUD_WIDTH - 24, 26, 22, INK, "right");
  text(context, t("hud.kills", { kills: compact(state.kills) }), HUD_WIDTH - 24, 56, 18, "#9fb0d0", "right");

  const width = 72;
  const healthFraction = state.player.health / maxHealth(state);
  bar(context, { x: player.x - width / 2, y: player.y + 14, w: width, h: 9 }, healthFraction, healthFraction > 0.35 ? "#38b764" : "#e43b44");
  if (state.player.dashCharges > 0) {
    context.fillStyle = "#73eff7";
    context.fillRect(player.x - 6, player.y + 30, 12, 6);
  }

  let x = 24;
  const y = HUD_HEIGHT - 86;
  for (const owned of state.weapons) {
    const rect = { x, y, w: 62, h: 62 };
    iconTile(context, rect, isEvolvedWeapon(owned.id) ? GOLD : WEAPON_ACCENT);
    drawIcon(context, weaponIcon(owned.id), x + 31, y + 29, 48);
    text(context, isEvolvedWeapon(owned.id) ? "★" : String(owned.level), x + 54, y + 40, 16, GOLD, "right");
    x += 70;
  }
  x += 12;
  for (const [id, owned] of state.passives) {
    const rect = { x, y: y + 14, w: 48, h: 48 };
    iconTile(context, rect, PASSIVE_ACCENT);
    drawIcon(context, passiveIcon(id), x + 24, y + 22, 32);
    text(context, String(owned), x + 44, y + 44, 13, GOLD, "right");
    x += 54;
  }
}

export function drawFloats(context: CanvasRenderingContext2D, floats: readonly FloatText[], project: (x: number, y: number) => { readonly x: number; readonly y: number }): void {
  for (const float of floats) {
    const screen = project(float.x, float.y);
    const rise = float.age * 0.9;
    context.globalAlpha = Math.max(0, 1 - float.age / 40);
    text(context, float.text, screen.x, screen.y - 40 - rise, float.size, float.color, "center");
  }
  context.globalAlpha = 1;
}

export function drawDialogue(context: CanvasRenderingContext2D, dialogue: Dialogue): void {
  const rect = { x: HUD_WIDTH / 2 - 420, y: HUD_HEIGHT - 210, w: 840, h: 110 };
  const fade = Math.min(1, dialogue.age / 8, (dialogue.life - dialogue.age) / 12);
  context.globalAlpha = Math.max(0, fade);
  panel(context, rect, dialogue.color);
  context.fillStyle = dialogue.color;
  context.fillRect(rect.x + 20, rect.y - 18, Math.min(400, measure(context, dialogue.speaker, 18) + 30), 34);
  text(context, dialogue.speaker, rect.x + 34, rect.y - 12, 18, SHADOW);
  const shown = dialogue.line.slice(0, Math.floor(dialogue.age * 1.6));
  wrap(context, shown, rect.w - 60, 22).forEach((line, index) => text(context, line, rect.x + 30, rect.y + 30 + index * 32, 22));
  context.globalAlpha = 1;
}

export function drawBanner(context: CanvasRenderingContext2D, banner: Banner): void {
  const fade = Math.min(1, banner.age / 10, (banner.life - banner.age) / 15);
  context.globalAlpha = Math.max(0, fade);
  text(context, banner.title, HUD_WIDTH / 2, 160, 56, GOLD, "center");
  text(context, banner.subtitle, HUD_WIDTH / 2, 222, 22, INK, "center");
  context.globalAlpha = 1;
}

const MARKER_AREA: Rect = { x: 56, y: 140, w: HUD_WIDTH - 112, h: HUD_HEIGHT - 140 - 130 };
const BOSS_HEAD_OFFSET = 175;

export function bossMarker(at: Point): { readonly x: number; readonly y: number; readonly angle: number; readonly onScreen: boolean } {
  const headY = at.y - BOSS_HEAD_OFFSET;
  const onScreen = inside(MARKER_AREA, at.x, Math.max(headY, MARKER_AREA.y)) && at.y < MARKER_AREA.y + MARKER_AREA.h + BOSS_HEAD_OFFSET;
  if (onScreen) {
    return { x: at.x, y: Math.max(headY, MARKER_AREA.y), angle: Math.PI / 2, onScreen };
  }
  const centerX = MARKER_AREA.x + MARKER_AREA.w / 2;
  const centerY = MARKER_AREA.y + MARKER_AREA.h / 2;
  const angle = Math.atan2(at.y - centerY, at.x - centerX);
  const reachX = MARKER_AREA.w / 2 / Math.max(1e-6, Math.abs(Math.cos(angle)));
  const reachY = MARKER_AREA.h / 2 / Math.max(1e-6, Math.abs(Math.sin(angle)));
  const reach = Math.min(reachX, reachY);
  return { x: centerX + Math.cos(angle) * reach, y: centerY + Math.sin(angle) * reach, angle, onScreen };
}

export function drawBossMarker(context: CanvasRenderingContext2D, at: Point, frame: number): void {
  const marker = bossMarker(at);
  const bob = marker.onScreen ? Math.sin(frame / 8) * 6 : Math.sin(frame / 6) * 4;
  const x = marker.x - (marker.onScreen ? 0 : Math.cos(marker.angle) * bob);
  const y = marker.y + (marker.onScreen ? bob : -Math.sin(marker.angle) * bob);
  context.save();
  context.translate(x, y);
  context.rotate(marker.angle);
  context.beginPath();
  context.moveTo(18, 0);
  context.lineTo(-12, -16);
  context.lineTo(-12, 16);
  context.closePath();
  context.fillStyle = "#ff4b5c";
  context.strokeStyle = "#1a1c2c";
  context.lineWidth = 4;
  context.stroke();
  context.fill();
  context.restore();
  const labelY = marker.onScreen ? y - 26 : y + (Math.sin(marker.angle) > 0.5 ? -30 : 38);
  text(context, t("hud.boss"), x, labelY, 18, "#ff9b9b", "center");
}

export function cardRects(count: number): Rect[] {
  const width = 360;
  const gap = 36;
  const total = count * width + (count - 1) * gap;
  return Array.from({ length: count }, (_, index) => ({ x: (HUD_WIDTH - total) / 2 + index * (width + gap), y: 236, w: width, h: 392 }));
}

export const REROLL_RECT: Rect = { x: HUD_WIDTH / 2 - 330, y: 670, w: 300, h: 60 };
export const SKIP_RECT: Rect = { x: HUD_WIDTH / 2 + 30, y: 670, w: 300, h: 60 };

export function drawLevelUp(context: CanvasRenderingContext2D, state: ArenaState, hover: number): void {
  context.fillStyle = "rgba(8, 10, 18, 0.62)";
  context.fillRect(0, 0, HUD_WIDTH, HUD_HEIGHT);
  text(context, t("levelUp.title", { level: state.level }), HUD_WIDTH / 2, 92, 60, GOLD, "center");
  text(context, t("levelUp.hint"), HUD_WIDTH / 2, 166, 20, "#9fb0d0", "center");
  const rects = cardRects(state.cards.length);
  state.cards.forEach((card, index) => {
    const rect = rects[index];
    if (rect) {
      drawCard(context, card, rect, index, hover === index);
    }
  });
  drawButton(context, REROLL_RECT, t("levelUp.reroll", { count: state.rerolls }), state.rerolls > 0);
  drawButton(context, SKIP_RECT, t("levelUp.skip", { count: state.skips }), state.skips > 0);
}

function reelCard(spin: ChestSpin, slot: number): Card {
  return slot >= REEL_SLOTS - 1 ? spin.prize : (spin.reel[slot % Math.max(1, spin.reel.length)] ?? spin.prize);
}

function cardIcon(card: Card): HTMLCanvasElement {
  return card.kind === "restore" ? cachedIcon("restore", RESTORE_ICON) : card.kind === "passive" ? passiveIcon(card.id) : weaponIcon(card.id);
}

export function drawChestSpin(context: CanvasRenderingContext2D, spin: ChestSpin, frame: number): void {
  context.fillStyle = "rgba(8, 10, 18, 0.62)";
  context.fillRect(0, 0, HUD_WIDTH, HUD_HEIGHT);
  const landed = spin.age >= CHEST_SPIN_FRAMES;
  const progress = Math.min(1, spin.age / CHEST_SPIN_FRAMES);
  const eased = 1 - (1 - progress) ** 3;
  const position = eased * (REEL_SLOTS - 1);
  text(context, t("chest.title"), HUD_WIDTH / 2, 70, 60, GOLD, "center");
  text(context, t("chest.hint"), HUD_WIDTH / 2, 142, 20, "#9fb0d0", "center");
  const machine = { x: HUD_WIDTH / 2 - 190, y: 186, w: 380, h: 420 };
  context.fillStyle = SHADOW;
  context.fillRect(machine.x - 8, machine.y - 8, machine.w + 16, machine.h + 16);
  context.fillStyle = landed && Math.floor(frame / 6) % 2 === 0 ? GOLD : "#b86f50";
  context.fillRect(machine.x - 4, machine.y - 4, machine.w + 8, machine.h + 8);
  context.fillStyle = "#3e2731";
  context.fillRect(machine.x, machine.y, machine.w, machine.h);
  for (let bulb = 0; bulb < 10; bulb += 1) {
    const lit = (bulb + Math.floor(frame / (landed ? 4 : 2))) % 2 === 0;
    context.fillStyle = lit ? GOLD : "#6b4a3a";
    const bx = machine.x + 22 + bulb * ((machine.w - 44) / 9);
    context.fillRect(bx - 5, machine.y + 10, 10, 10);
    context.fillRect(bx - 5, machine.y + machine.h - 20, 10, 10);
  }
  const reelWindow = { x: machine.x + 40, y: machine.y + 40, w: machine.w - 80, h: machine.h - 80 };
  context.fillStyle = CARD_INSET;
  context.fillRect(reelWindow.x, reelWindow.y, reelWindow.w, reelWindow.h);
  const centerY = reelWindow.y + reelWindow.h / 2;
  context.save();
  context.beginPath();
  context.rect(reelWindow.x, reelWindow.y, reelWindow.w, reelWindow.h);
  context.clip();
  const first = Math.max(0, Math.floor(position) - 2);
  for (let slot = first; slot <= Math.min(REEL_SLOTS - 1, first + 4); slot += 1) {
    const y = centerY + (slot - position) * REEL_SLOT_HEIGHT;
    const card = reelCard(spin, slot);
    const tile = { x: reelWindow.x + reelWindow.w / 2 - 56, y: y - 56, w: 112, h: 112 };
    context.globalAlpha = Math.max(0.25, 1 - Math.abs(slot - position) * 0.55);
    iconTile(context, tile, cardAccent(card));
    drawIcon(context, cardIcon(card), tile.x + tile.w / 2, tile.y + tile.h / 2 - 2, 96);
  }
  context.globalAlpha = 1;
  context.restore();
  context.fillStyle = landed ? GOLD : "#f4f1e8";
  context.fillRect(reelWindow.x - 4, centerY - 70, 14, 6);
  context.fillRect(reelWindow.x - 4, centerY + 64, 14, 6);
  context.fillRect(reelWindow.x + reelWindow.w - 10, centerY - 70, 14, 6);
  context.fillRect(reelWindow.x + reelWindow.w - 10, centerY + 64, 14, 6);
  if (landed) {
    const card = spin.prize;
    const name = cardName(card);
    text(context, name, HUD_WIDTH / 2, 640, fitSize(context, name, 900, 40), INK, "center");
    const badge = card.kind === "evolve" ? t("card.evolve") : card.kind === "restore" ? t("card.restore.kind") : card.toLevel === 1 ? t("card.new") : t("card.levelChange", { from: card.toLevel - 1, to: card.toLevel });
    text(context, badge, HUD_WIDTH / 2, 698, 24, cardAccent(card), "center");
  }
}

function drawButton(context: CanvasRenderingContext2D, rect: Rect, label: string, enabled: boolean): void {
  context.globalAlpha = enabled ? 1 : 0.4;
  panel(context, rect);
  const size = fitSize(context, label, rect.w - 24, 20);
  text(context, label, rect.x + rect.w / 2, rect.y + 30 - size / 2, size, INK, "center");
  context.globalAlpha = 1;
}

function cardAccent(card: Card): string {
  return card.kind === "evolve" ? GOLD : card.kind === "weapon" ? WEAPON_ACCENT : card.kind === "restore" ? RESTORE_ACCENT : PASSIVE_ACCENT;
}

function cardMaxLevel(card: Card): number {
  return card.kind === "restore" ? 0 : card.kind === "passive" ? PASSIVES[card.id].maxLevel : WEAPONS[card.id].levels.length;
}

function drawPips(context: CanvasRenderingContext2D, card: Card, centerX: number, y: number): void {
  const count = cardMaxLevel(card);
  const size = 14;
  const gap = 6;
  const left = centerX - (count * size + (count - 1) * gap) / 2;
  for (let index = 0; index < count; index += 1) {
    const x = left + index * (size + gap);
    context.fillStyle = SHADOW;
    context.fillRect(x - 2, y - 2, size + 4, size + 4);
    const level = index + 1;
    context.fillStyle = level < card.toLevel ? cardAccent(card) : level === card.toLevel ? INK : TILE;
    context.fillRect(x, y, size, size);
  }
}

function drawCard(context: CanvasRenderingContext2D, card: Card, rect: Rect, index: number, hovered: boolean): void {
  const lift = hovered ? -12 : 0;
  const box = { ...rect, y: rect.y + lift };
  const accent = cardAccent(card);
  context.fillStyle = SHADOW;
  context.fillRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
  context.fillStyle = hovered ? accent : card.recommended ? "#a7f070" : PANEL_EDGE;
  context.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
  context.fillStyle = CARD_FACE;
  context.fillRect(box.x, box.y, box.w, box.h);
  context.fillStyle = accent;
  context.fillRect(box.x, box.y, box.w, 40);
  const kindLabel = card.kind === "evolve" ? t("card.evolve") : card.kind === "weapon" ? t("card.weapon") : card.kind === "restore" ? t("card.restore.kind") : t("card.passive");
  text(context, kindLabel, box.x + 18, box.y + 11, 18, SHADOW);
  const badge = card.kind === "evolve" || card.kind === "restore" ? "★" : card.toLevel === 1 ? t("card.new") : t("card.levelChange", { from: card.toLevel - 1, to: card.toLevel });
  text(context, badge, box.x + box.w - 18, box.y + 11, 18, SHADOW, "right");
  if (card.recommended) {
    const label = t("card.recommended");
    const width = Math.min(box.w - 20, measure(context, label, 15) + 24);
    context.fillStyle = SHADOW;
    context.fillRect(box.x + box.w / 2 - width / 2 - 3, box.y - 31, width + 6, 32);
    context.fillStyle = "#a7f070";
    context.fillRect(box.x + box.w / 2 - width / 2, box.y - 28, width, 26);
    text(context, label, box.x + box.w / 2, box.y - 23, 15, SHADOW, "center");
  }
  const tile = { x: box.x + box.w / 2 - 56, y: box.y + 58, w: 112, h: 112 };
  iconTile(context, tile, accent);
  drawIcon(context, cardIcon(card), tile.x + tile.w / 2, tile.y + tile.h / 2 - 2, 96);
  const name = cardName(card);
  text(context, name, box.x + box.w / 2, box.y + 186, fitSize(context, name, box.w - 32, 26), INK, "center");
  if (card.kind !== "evolve" && card.kind !== "restore") {
    drawPips(context, card, box.x + box.w / 2, box.y + 222);
  }
  wrap(context, cardBlurb(card), box.w - 40, 15).slice(0, 2).forEach((line, lineIndex) =>
    text(context, line, box.x + box.w / 2, box.y + 248 + lineIndex * 21, 15, "#c8cfe0", "center"),
  );
  const inset = { x: box.x + 14, y: box.y + 298, w: box.w - 28, h: box.h - 312 };
  context.fillStyle = CARD_INSET;
  context.fillRect(inset.x, inset.y, inset.w, inset.h);
  card.changes.slice(0, 3).forEach((change, lineIndex) => {
    const y = inset.y + 10 + lineIndex * 24;
    text(context, changeLabel(change), inset.x + 12, y, 15, "#9fb0d0");
    text(context, `${changeValue(change, change.before)} ▸ ${changeValue(change, change.after)}`, inset.x + inset.w - 12, y, 15, accent, "right");
  });
  const key = { x: box.x + box.w / 2 - 18, y: box.y + box.h - 14, w: 36, h: 30 };
  context.fillStyle = SHADOW;
  context.fillRect(key.x - 3, key.y - 3, key.w + 6, key.h + 6);
  context.fillStyle = hovered ? accent : TILE_LIGHT;
  context.fillRect(key.x, key.y, key.w, key.h);
  text(context, String(index + 1), key.x + key.w / 2, key.y + 6, 18, hovered ? SHADOW : INK, "center");
}

export function drawPause(context: CanvasRenderingContext2D, state: ArenaState): void {
  context.fillStyle = "rgba(8, 10, 18, 0.78)";
  context.fillRect(0, 0, HUD_WIDTH, HUD_HEIGHT);
  text(context, t("pause.title"), HUD_WIDTH / 2, 70, 52, GOLD, "center");
  text(context, t("pause.keys"), HUD_WIDTH / 2, 140, 18, "#9fb0d0", "center");
  const left = { x: 160, y: 200, w: 540, h: 520 };
  const right = { x: 740, y: 200, w: 540, h: 520 };
  panel(context, left);
  panel(context, right);
  text(context, t("pause.build"), left.x + 28, left.y + 24, 26, GOLD);
  const seconds = Math.max(1, elapsedSeconds(state));
  state.weapons.forEach((owned, index) => {
    const y = left.y + 80 + index * 46;
    const damage = state.damageByWeapon.get(owned.id) ?? 0;
    text(context, isEvolvedWeapon(owned.id) ? `${weaponName(owned.id)} ★` : t("pause.partLevel", { name: weaponName(owned.id), level: owned.level }), left.x + 28, y, 18);
    text(context, t("pause.dps", { dps: Math.round(damage / seconds) }), left.x + left.w - 28, y, 18, "#a7f070", "right");
  });
  [...state.passives].forEach(([id, owned], index) => {
    text(context, t("pause.partLevel", { name: passiveName(id), level: owned }), left.x + 28, left.y + 330 + index * 32, 16, "#c8cfe0");
  });
  text(context, t("pause.stats"), right.x + 28, right.y + 24, 26, GOLD);
  const stats: [string, string][] = [
    [t("stat.maxHealth"), String(maxHealth(state))],
    [t("stat.hallucination"), `${hallucinationPercent(state)}%`],
    [t("stat.crit"), `${critPercent(state)}%`],
    [t("stat.damageBonus"), `+${statTotal(state, "damage")}%`],
    [t("stat.cooldown"), `${statTotal(state, "cooldown")}%`],
    [t("stat.speed"), `${playerSpeed(state)}`],
    [t("stat.pickup"), t("unit.pixels", { value: Math.round(pickupRadius(state) / 16) })],
    [t("stat.armor"), String(statTotal(state, "armor"))],
    [t("stat.rerolls"), String(state.rerolls)],
    [t("stat.seed"), `#${state.seed}`],
  ];
  stats.forEach(([label, value], index) => {
    const y = right.y + 80 + index * 40;
    text(context, label, right.x + 28, y, 18, "#c8cfe0");
    text(context, value, right.x + right.w - 28, y, 18, INK, "right");
  });
}

export const SHARE_RECT: Rect = { x: HUD_WIDTH / 2 - 486, y: 678, w: 300, h: 56 };
export const POST_RECT: Rect = { x: HUD_WIDTH / 2 - 150, y: 678, w: 300, h: 56 };
export const WATCH_RECT: Rect = { x: HUD_WIDTH / 2 + 186, y: 678, w: 300, h: 56 };

export interface ResultsView {
  readonly replay: boolean;
  readonly mismatch: boolean;
  readonly shareReady: boolean;
}

export function drawResults(context: CanvasRenderingContext2D, state: ArenaState, view: ResultsView): void {
  context.fillStyle = "rgba(8, 10, 18, 0.84)";
  context.fillRect(0, 0, HUD_WIDTH, HUD_HEIGHT);
  const won = state.status === "won";
  text(context, won ? t("results.wonTitle") : t("results.lostTitle"), HUD_WIDTH / 2, 60, 46, won ? GOLD : "#ff9b9b", "center");
  text(
    context,
    won ? t("results.wonLine") : t("results.killedBy", { killer: killerName(state.killedBy) }),
    HUD_WIDTH / 2,
    124,
    20,
    INK,
    "center",
  );
  const left = { x: 160, y: 190, w: 540, h: 470 };
  const right = { x: 740, y: 190, w: 540, h: 470 };
  panel(context, left);
  panel(context, right);
  const rows: [string, string][] = [
    [t("stat.score"), compact(score(state))],
    [t("stat.time"), clock(elapsedSeconds(state))],
    [t("stat.level"), String(state.level)],
    [t("stat.kills"), compact(state.kills)],
    [t("stat.bosses"), `${state.bossesDown} / ${WORLDS.length}`],
    [t("stat.tier"), tierLabel(state.tier)],
    [t("stat.seed"), `#${state.seed}`],
  ];
  rows.forEach(([label, value], index) => {
    const y = left.y + 32 + index * 58;
    text(context, label, left.x + 28, y, 20, "#c8cfe0");
    text(context, value, left.x + left.w - 28, y, 20, INK, "right");
  });
  text(context, t("results.damageByPart"), right.x + 28, right.y + 28, 22, GOLD);
  const total = [...state.damageByWeapon.values()].reduce((sum, value) => sum + value, 0) || 1;
  [...state.damageByWeapon].sort((a, b) => b[1] - a[1]).slice(0, 7).forEach(([id, damage], index) => {
    const y = right.y + 80 + index * 52;
    text(context, weaponName(id), right.x + 28, y, 16, INK);
    text(context, compact(damage), right.x + right.w - 28, y, 16, "#a7f070", "right");
    bar(context, { x: right.x + 28, y: y + 26, w: right.w - 56, h: 10 }, damage / total, "#41a6f6");
  });
  drawButton(context, SHARE_RECT, t("share.button"), view.shareReady);
  drawButton(context, POST_RECT, t("share.x"), view.shareReady);
  drawButton(context, WATCH_RECT, view.replay ? t("replay.again") : t("replay.watch"), true);
  text(context, view.replay ? t("replay.keys") : t("results.keys"), HUD_WIDTH / 2, 748, 18, GOLD, "center");
  text(context, t("mastra.link"), HUD_WIDTH / 2, 780, 14, "#9fb0d0", "center");
  if (view.replay) {
    drawReplayTag(context, t("replay.tag"));
  }
  if (view.mismatch) {
    text(context, t("replay.mismatch"), HUD_WIDTH / 2, 158, 16, "#ff9b9b", "center");
  }
}

export function drawReplayTag(context: CanvasRenderingContext2D, label: string): void {
  const size = 18;
  const width = measure(context, label, size) + 32;
  const rect = { x: HUD_WIDTH - 24 - width, y: 96, w: width, h: 36 };
  context.fillStyle = SHADOW;
  context.fillRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
  context.fillStyle = "#e43b44";
  context.fillRect(rect.x, rect.y, rect.w, rect.h);
  text(context, label, rect.x + rect.w / 2, rect.y + 9, size, INK, "center");
}

export function drawReplayHud(context: CanvasRenderingContext2D, speed: number): void {
  drawReplayTag(context, t("replay.speed", { speed }));
  text(context, t("replay.hint"), HUD_WIDTH - 24, 142, 15, "#9fb0d0", "right");
}

export function drawNotice(context: CanvasRenderingContext2D, notice: string, alpha: number): void {
  const size = 20;
  const width = measure(context, notice, size) + 48;
  const rect = { x: HUD_WIDTH / 2 - width / 2, y: 18, w: width, h: 48 };
  context.globalAlpha = Math.max(0, Math.min(1, alpha));
  panel(context, rect, GOLD);
  text(context, notice, HUD_WIDTH / 2, rect.y + 14, size, INK, "center");
  context.globalAlpha = 1;
}

export function drawTitle(context: CanvasRenderingContext2D, pulse: number): void {
  context.fillStyle = "rgba(8, 10, 18, 0.45)";
  context.fillRect(0, 0, HUD_WIDTH, HUD_HEIGHT);
  text(context, t("game.title"), HUD_WIDTH / 2, 170, 96, GOLD, "center");
  text(context, t("title.tagline"), HUD_WIDTH / 2, 300, 22, INK, "center");
  context.globalAlpha = 0.6 + 0.4 * Math.sin(pulse / 12);
  text(context, t("title.start"), HUD_WIDTH / 2, 430, 34, INK, "center");
  context.globalAlpha = 1;
  text(context, t("title.controls"), HUD_WIDTH / 2, 520, 18, "#9fb0d0", "center");
  text(context, t("title.howTo"), HUD_WIDTH / 2, 556, 18, "#9fb0d0", "center");
  text(context, t("title.language", { language: localeName(currentLocale()) }), HUD_WIDTH / 2, 620, 20, GOLD, "center");
  text(context, t("mastra.link"), HUD_WIDTH / 2, 730, 16, "#9fb0d0", "center");
}

export function inside(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
