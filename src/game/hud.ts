import { PASSIVE_ICONS, RESTORE_ICON, WEAPON_ICONS } from "../art/icons";
import type { Sprite } from "../art/sprites";
import type { Card } from "../sim/arena/cards";
import {
  BOSS_PHASE_FLOORS,
  isEvolvedWeapon,
  PASSIVES,
  WEAPONS,
  WORLDS,
  type PassiveId,
  type WeaponId,
} from "../sim/arena/content";
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
import { currentLocale, t, usesSpaces } from "../i18n";
import { fillBehindPopup, view, view as currentView, WIDE_STAGE } from "./layout";
import {
  cardBlurb,
  cardName,
  changeLabel,
  changeValue,
  clock,
  compact,
  killerName,
  passiveName,
  rivalName,
  tierLabel,
  weaponName,
} from "./format";

const FONT =
  '"Silkscreen", "DotGothic16", "Press Start 2P", ui-monospace, monospace';
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

function drawIcon(
  context: CanvasRenderingContext2D,
  icon: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  size: number,
): void {
  const scale = Math.max(
    1,
    Math.floor(size / Math.max(icon.width, icon.height)),
  );
  context.imageSmoothingEnabled = false;
  context.drawImage(
    icon,
    Math.round(centerX - (icon.width * scale) / 2),
    Math.round(centerY - (icon.height * scale) / 2),
    icon.width * scale,
    icon.height * scale,
  );
}

function iconTile(
  context: CanvasRenderingContext2D,
  rect: Rect,
  accent: string,
): void {
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

export function panel(context: CanvasRenderingContext2D, rect: Rect, edge = PANEL_EDGE): void {
  context.fillStyle = PANEL;
  context.fillRect(rect.x, rect.y, rect.w, rect.h);
  context.strokeStyle = edge;
  context.lineWidth = 3;
  context.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3);
}

function bar(
  context: CanvasRenderingContext2D,
  rect: Rect,
  fraction: number,
  fill: string,
  back = "#2a2f45",
): void {
  context.fillStyle = SHADOW;
  context.fillRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
  context.fillStyle = back;
  context.fillRect(rect.x, rect.y, rect.w, rect.h);
  context.fillStyle = fill;
  context.fillRect(
    rect.x,
    rect.y,
    Math.round(rect.w * Math.max(0, Math.min(1, fraction))),
    rect.h,
  );
}

export function measure(context: CanvasRenderingContext2D, value: string, size: number): number {
  context.font = `${size}px ${FONT}`;
  return context.measureText(value).width;
}

export function fitSize(context: CanvasRenderingContext2D, value: string, width: number, size: number): number {
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

export function wrapLines(
  value: string,
  width: number,
  spaced: boolean,
  measureWidth: (line: string) => number,
): string[] {
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

function wrap(
  context: CanvasRenderingContext2D,
  value: string,
  width: number,
  size: number,
): string[] {
  context.font = `${size}px ${FONT}`;
  return wrapLines(
    value,
    width,
    usesSpaces(currentLocale()),
    (line) => context.measureText(line).width,
  );
}

export function drawRunHud(
  context: CanvasRenderingContext2D,
  state: ArenaState,
  player: { readonly x: number; readonly y: number },
  boss: { readonly name: string; readonly fraction: number } | null,
  covered = false,
): void {
  if (covered) {
    return;
  }
  const v = view();
  const left = v.safe.left + 24;
  const right = v.width - v.safe.right - 24;
  const top = v.safe.top;
  const middle = v.width / 2;
  const xpFraction = state.xp / xpToNext(state.level);
  bar(
    context,
    { x: 0, y: top, w: v.width, h: 10 },
    xpFraction,
    "#73eff7",
    "#1a2033",
  );

  text(context, t("hud.level", { level: state.level }), left, top + 26, 30, GOLD);
  const tier = tierLabel(state.tier);
  const sideWidth = v.portrait ? right - left : middle - left - 90;
  text(context, tier, left, top + 64, fitSize(context, tier, sideWidth, 18));
  const world = t("hud.world", {
    world: Math.min(state.bossesDown + 1, WORLDS.length),
    rival: rivalName(currentWorld(state)),
  });
  text(context, world, left, top + 90, fitSize(context, world, sideWidth, 16), "#9fb0d0");

  text(
    context,
    clock(elapsedSeconds(state)),
    middle,
    top + 22,
    40,
    INK,
    "center",
  );
  if (boss) {
    const bossTop = top + (v.portrait ? 122 : 74);
    text(context, boss.name, middle, bossTop, fitSize(context, boss.name, right - left, 18), "#ff9b9b", "center");
    const barWidth = Math.min(520, right - left);
    const barRect = { x: middle - barWidth / 2, y: bossTop + 26, w: barWidth, h: 16 };
    bar(context, barRect, boss.fraction, "#e43b44");
    context.fillStyle = "#1a1c2c";
    for (const floor of BOSS_PHASE_FLOORS) {
      if (floor > 0) {
        context.fillRect(
          barRect.x + (barRect.w * floor) / 100 - 2,
          barRect.y - 4,
          4,
          barRect.h + 8,
        );
      }
    }
    const fight = state.fight;
    if (fight && fight.phase === 3) {
      const seconds = Math.ceil(fight.acquireTicks / TICKS_PER_SECOND);
      const urgent =
        seconds <= 10 && Math.floor(fight.acquireTicks / 15) % 2 === 0;
      text(
        context,
        t("boss.acquire", { time: clock(seconds) }),
        middle,
        bossTop + 54,
        18,
        urgent ? "#ff4b5c" : GOLD,
        "center",
      );
    }
  }

  text(
    context,
    t("hud.score", { score: compact(score(state)) }),
    right,
    top + 26,
    22,
    INK,
    "right",
  );
  text(
    context,
    t("hud.kills", { kills: compact(state.kills) }),
    right,
    top + 56,
    18,
    "#9fb0d0",
    "right",
  );

  const width = 72;
  const healthFraction = state.player.health / maxHealth(state);
  bar(
    context,
    { x: player.x - width / 2, y: player.y + 14, w: width, h: 9 },
    healthFraction,
    healthFraction > 0.35 ? "#38b764" : "#e43b44",
  );
  if (state.player.dashCharges > 0) {
    context.fillStyle = "#73eff7";
    context.fillRect(player.x - 6, player.y + 30, 12, 6);
  }

  const slots = loadoutSlots(state.weapons.length, state.passives.size);
  state.weapons.forEach((owned, index) => {
    const rect = slots.weapons[index];
    if (!rect) {
      return;
    }
    iconTile(context, rect, isEvolvedWeapon(owned.id) ? GOLD : WEAPON_ACCENT);
    drawIcon(context, weaponIcon(owned.id), rect.x + 31, rect.y + 29, 48);
    text(
      context,
      isEvolvedWeapon(owned.id) ? "★" : String(owned.level),
      rect.x + 54,
      rect.y + 40,
      16,
      GOLD,
      "right",
    );
  });
  [...state.passives].forEach(([id, owned], index) => {
    const rect = slots.passives[index];
    if (!rect) {
      return;
    }
    iconTile(context, rect, PASSIVE_ACCENT);
    drawIcon(context, passiveIcon(id), rect.x + 24, rect.y + 8, 32);
    text(context, String(owned), rect.x + 44, rect.y + 30, 13, GOLD, "right");
  });
}

export interface LoadoutSlots {
  readonly weapons: readonly Rect[];
  readonly passives: readonly Rect[];
  readonly bounds: Rect;
}

const WEAPON_STEP = 70;
const PASSIVE_STEP = 54;

export function loadoutSlots(weapons: number, passives: number): LoadoutSlots {
  const v = view();
  const left = v.safe.left + 24;
  const bottom = v.height - v.safe.bottom - 24;
  const weaponsWidth = weapons * WEAPON_STEP;
  const oneRow = left + weaponsWidth + 12 + passives * PASSIVE_STEP <= v.width - v.safe.right - 12;
  const weaponY = bottom - 62;
  const weaponRects = Array.from({ length: weapons }, (_, index) => ({ x: left + index * WEAPON_STEP, y: weaponY, w: 62, h: 62 }));
  const passiveX = oneRow ? left + weaponsWidth + 12 : left;
  const passiveY = oneRow || weapons === 0 ? bottom - 48 : weaponY - 62;
  const passiveRects = Array.from({ length: passives }, (_, index) => ({ x: passiveX + index * PASSIVE_STEP, y: passiveY, w: 48, h: 48 }));
  const all = [...weaponRects, ...passiveRects];
  const right = Math.max(left + 116, ...all.map((rect) => rect.x + rect.w));
  const topY = Math.min(bottom - 62, ...all.map((rect) => rect.y));
  return {
    weapons: weaponRects,
    passives: passiveRects,
    bounds: { x: left - 12, y: topY - 12, w: right - left + 24, h: bottom - topY + 24 },
  };
}

export function drawFloats(
  context: CanvasRenderingContext2D,
  floats: readonly FloatText[],
  project: (x: number, y: number) => { readonly x: number; readonly y: number },
): void {
  for (const float of floats) {
    const screen = project(float.x, float.y);
    const rise = float.age * 0.9;
    context.globalAlpha = Math.max(0, 1 - float.age / 40);
    text(
      context,
      float.text,
      screen.x,
      screen.y - 40 - rise,
      float.size,
      float.color,
      "center",
    );
  }
  context.globalAlpha = 1;
}

export interface SpeakerView {
  readonly name: string;
  readonly color: string;
  readonly portrait: HTMLCanvasElement;
  readonly text: string;
  readonly shown: number;
  readonly hold: boolean;
  readonly typing: boolean;
  readonly autoOn: boolean;
  readonly autoFill: number;
  readonly age: number;
  readonly first: boolean;
  readonly frame: number;
  readonly rect?: Rect;
}

export function speakerRect(): Rect {
  const v = view();
  const w = Math.min(940, v.width - v.safe.left - v.safe.right - 24);
  const h = w < COMPACT_SPEAKER_WIDTH ? 200 : 150;
  return { x: Math.round((v.width - w) / 2), y: v.height - v.safe.bottom - h - 46, w, h };
}

const COMPACT_SPEAKER_WIDTH = 700;
const PORTRAIT_BOX = 126;
const COMPACT_PORTRAIT_BOX = 96;
const SPEAKER_SIZES = [25, 22, 20, 18] as const;
const COMPACT_SPEAKER_SIZES = [22, 20, 18, 16] as const;
const PLATE_SIZES = [18, 16, 14, 12] as const;

function pill(
  context: CanvasRenderingContext2D,
  label: string,
  right: number,
  y: number,
  active: boolean,
  fill: number,
  color: string,
): number {
  const width = measure(context, label, 16) + 26;
  const x = right - width;
  context.fillStyle = SHADOW;
  context.fillRect(x - 2, y - 2, width + 4, 34);
  context.fillStyle = active ? color : CARD_FACE;
  context.fillRect(x, y, width, 30);
  if (fill > 0) {
    context.fillStyle = active ? "rgba(16, 18, 30, 0.35)" : color;
    context.fillRect(x, y + 26, Math.round(width * Math.min(1, fill)), 4);
  }
  text(context, label, x + 13, y + 7, 16, active ? SHADOW : INK);
  return x;
}

export function drawSpeaker(
  context: CanvasRenderingContext2D,
  view: SpeakerView,
): void {
  const enter = view.first ? Math.min(1, view.age / 0.16) : 1;
  const at = view.rect ?? speakerRect();
  const compact = at.w < COMPACT_SPEAKER_WIDTH;
  const box = compact ? COMPACT_PORTRAIT_BOX : PORTRAIT_BOX;
  const maxLines = compact ? 5 : 3;
  const sizes = compact ? COMPACT_SPEAKER_SIZES : SPEAKER_SIZES;
  const rect = { ...at, y: at.y + Math.round((1 - enter) * 24) };
  context.save();
  context.globalAlpha = enter * (view.hold ? 1 : 0.94);
  context.fillStyle = SHADOW;
  context.fillRect(rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8);
  context.fillStyle = "rgba(14, 16, 26, 0.94)";
  context.fillRect(rect.x, rect.y, rect.w, rect.h);
  context.strokeStyle = view.color;
  context.lineWidth = 3;
  context.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3);
  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 2;
  context.strokeRect(rect.x + 7, rect.y + 7, rect.w - 14, rect.h - 14);

  const frameX = rect.x + 12;
  const frameY = rect.y + 12;
  context.fillStyle = "#232741";
  context.fillRect(frameX, frameY, box, box);
  context.fillStyle = "#2c3150";
  context.fillRect(
    frameX,
    frameY + box * 0.62,
    box,
    box * 0.38,
  );
  const portrait = view.portrait;
  const fit = Math.min((box - 6) / portrait.width, (box - 6) / portrait.height);
  const scale = compact ? fit : Math.max(1, Math.floor(fit));
  const pop = view.age < 0.12 ? Math.round((1 - view.age / 0.12) * 4) : 0;
  const width = portrait.width * scale;
  const height = portrait.height * scale;
  context.imageSmoothingEnabled = false;
  context.save();
  context.beginPath();
  context.rect(frameX, frameY, box, box);
  context.clip();
  context.drawImage(
    portrait,
    frameX + (box - width) / 2,
    frameY + box - height + pop,
    width,
    height,
  );
  context.restore();
  context.strokeStyle = view.color;
  context.lineWidth = 3;
  context.strokeRect(
    frameX + 1.5,
    frameY + 1.5,
    box - 3,
    box - 3,
  );

  const textX = frameX + box + 24;
  const plateMax = rect.w - (textX - rect.x) - 24;
  const plateSize = PLATE_SIZES.find((size) => measure(context, view.name, size) + 28 <= plateMax) ?? 12;
  const plateWidth = Math.min(plateMax, measure(context, view.name, plateSize) + 28);
  context.fillStyle = SHADOW;
  context.fillRect(textX - 2, rect.y - 20, plateWidth + 4, 36);
  context.fillStyle = view.color;
  context.fillRect(textX, rect.y - 18, plateWidth, 32);
  text(context, view.name, textX + 14, rect.y - 2 - Math.round(plateSize / 2), plateSize, SHADOW);

  const textWidth = rect.x + rect.w - textX - 28;
  const size =
    sizes.find(
      (candidate) => wrap(context, view.text, textWidth, candidate).length <= maxLines,
    ) ??
    sizes[sizes.length - 1] ??
    18;
  const lines = wrap(context, view.text, textWidth, size);
  const joiner = usesSpaces(currentLocale()) ? 1 : 0;
  const gap = Math.round(size * 1.42);
  let left = view.shown;
  lines.slice(0, maxLines).forEach((line, index) => {
    const chars = [...line];
    const visible = chars.slice(0, Math.max(0, left)).join("");
    left -= chars.length + joiner;
    if (visible) {
      text(context, visible, textX, rect.y + 28 + index * gap, size);
    }
  });

  if (!view.typing && view.hold) {
    const bob = Math.floor(view.frame / 12) % 2 === 0 ? 0 : 4;
    const ax = rect.x + rect.w - 34;
    const ay = rect.y + rect.h - 34 + bob;
    context.fillStyle = view.color;
    context.beginPath();
    context.moveTo(ax - 9, ay);
    context.lineTo(ax + 9, ay);
    context.lineTo(ax, ay + 10);
    context.closePath();
    context.fill();
  }

  if (view.hold) {
    const y = rect.y + rect.h - 14;
    const next = pill(
      context,
      t("story.next"),
      rect.x + rect.w - 18,
      y,
      false,
      0,
      view.color,
    );
    pill(
      context,
      t("story.auto"),
      next - 12,
      y,
      view.autoOn,
      view.autoOn ? view.autoFill : 0,
      view.color,
    );
    const skipWidth = measure(context, t("story.skip"), 16) + 26;
    pill(context, t("story.skip"), textX + skipWidth, y, false, 0, view.color);
  } else {
    context.fillStyle = view.color;
    context.fillRect(
      rect.x + 3,
      rect.y + rect.h - 6,
      Math.round((rect.w - 6) * Math.min(1, view.autoFill)),
      3,
    );
  }
  context.restore();
}

export function drawBanner(
  context: CanvasRenderingContext2D,
  banner: Banner,
): void {
  const fade = Math.min(1, banner.age / 10, (banner.life - banner.age) / 15);
  context.globalAlpha = Math.max(0, fade);
  const v = view();
  const top = v.safe.top + (v.portrait ? 236 : 160);
  const room = v.width - v.safe.left - v.safe.right - 40;
  text(context, banner.title, v.width / 2, top, fitSize(context, banner.title, room, 56), GOLD, "center");
  text(context, banner.subtitle, v.width / 2, top + 62, fitSize(context, banner.subtitle, room, 22), INK, "center");
  context.globalAlpha = 1;
}

function markerArea(): Rect {
  const v = view();
  const x = v.safe.left + 56;
  const y = v.safe.top + (v.portrait ? 210 : 140);
  return { x, y, w: v.width - v.safe.right - 56 - x, h: v.height - v.safe.bottom - 130 - y };
}
const BOSS_HEAD_OFFSET = 175;

export function bossMarker(at: Point): {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly onScreen: boolean;
} {
  const MARKER_AREA = markerArea();
  const headY = at.y - BOSS_HEAD_OFFSET;
  const onScreen =
    inside(MARKER_AREA, at.x, Math.max(headY, MARKER_AREA.y)) &&
    at.y < MARKER_AREA.y + MARKER_AREA.h + BOSS_HEAD_OFFSET;
  if (onScreen) {
    return {
      x: at.x,
      y: Math.max(headY, MARKER_AREA.y),
      angle: Math.PI / 2,
      onScreen,
    };
  }
  const centerX = MARKER_AREA.x + MARKER_AREA.w / 2;
  const centerY = MARKER_AREA.y + MARKER_AREA.h / 2;
  const angle = Math.atan2(at.y - centerY, at.x - centerX);
  const reachX = MARKER_AREA.w / 2 / Math.max(1e-6, Math.abs(Math.cos(angle)));
  const reachY = MARKER_AREA.h / 2 / Math.max(1e-6, Math.abs(Math.sin(angle)));
  const reach = Math.min(reachX, reachY);
  return {
    x: centerX + Math.cos(angle) * reach,
    y: centerY + Math.sin(angle) * reach,
    angle,
    onScreen,
  };
}

export function drawBossMarker(
  context: CanvasRenderingContext2D,
  at: Point,
  frame: number,
): void {
  const marker = bossMarker(at);
  const bob = marker.onScreen
    ? Math.sin(frame / 8) * 6
    : Math.sin(frame / 6) * 4;
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
  const labelY = marker.onScreen
    ? y - 26
    : y + (Math.sin(marker.angle) > 0.5 ? -30 : 38);
  text(context, t("hud.boss"), x, labelY, 18, "#ff9b9b", "center");
}

export function cardRects(count: number): Rect[] {
  const width = 360;
  const gap = 36;
  const total = count * width + (count - 1) * gap;
  return Array.from({ length: count }, (_, index) => ({
    x: (WIDE_STAGE.width - total) / 2 + index * (width + gap),
    y: 236,
    w: width,
    h: 392,
  }));
}

export function rerollRect(): Rect {
  return { x: WIDE_STAGE.width / 2 - 330, y: 670, w: 300, h: 60 };
}

export function skipRect(): Rect {
  return { x: WIDE_STAGE.width / 2 + 30, y: 670, w: 300, h: 60 };
}

export interface LevelUpGuide {
  readonly name: string;
  readonly text: string;
  readonly portrait: HTMLCanvasElement;
  readonly accent: string;
  readonly progress: number;
}

export function guideStripRect(): Rect {
  return { x: WIDE_STAGE.width / 2 - 590, y: 88, w: 1180, h: 96 };
}

const GUIDE_SIZES = [18, 16, 15, 14, 13, 12, 11] as const;
const GUIDE_TEXT_TOP = 32;
const GUIDE_TEXT_BOTTOM = 10;

export interface TextFit {
  readonly size: number;
  readonly gap: number;
  readonly lines: number;
}

export function fitTextBlock(sizes: readonly number[], linesAt: (size: number) => number, height: number): TextFit {
  const fallback = sizes[sizes.length - 1] ?? 12;
  for (const size of sizes) {
    const gap = Math.round(size * 1.3);
    const lines = linesAt(size);
    if ((lines - 1) * gap + size + Math.max(2, size / 8) <= height) {
      return { size, gap, lines };
    }
  }
  const gap = Math.round(fallback * 1.3);
  return { size: fallback, gap, lines: Math.max(1, Math.floor((height - fallback) / gap) + 1) };
}

function drawGuideStrip(
  context: CanvasRenderingContext2D,
  guide: LevelUpGuide,
): void {
  const rect = guideStripRect();
  context.fillStyle = SHADOW;
  context.fillRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
  context.fillStyle = "rgba(14, 16, 26, 0.95)";
  context.fillRect(rect.x, rect.y, rect.w, rect.h);
  context.strokeStyle = guide.accent;
  context.lineWidth = 2;
  context.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  const frame = { x: rect.x + 8, y: rect.y + 8, w: 80, h: 80 };
  context.fillStyle = "#232741";
  context.fillRect(frame.x, frame.y, frame.w, frame.h);
  context.imageSmoothingEnabled = false;
  context.drawImage(guide.portrait, frame.x, frame.y, frame.w, frame.h);
  context.strokeStyle = guide.accent;
  context.strokeRect(frame.x + 1, frame.y + 1, frame.w - 2, frame.h - 2);
  const textX = frame.x + frame.w + 18;
  const width = rect.x + rect.w - textX - 18;
  text(context, guide.name, textX, rect.y + 10, fitSize(context, guide.name, width, 16), guide.accent);
  const fit = fitTextBlock(
    GUIDE_SIZES,
    (size) => wrap(context, guide.text, width, size).length,
    rect.h - GUIDE_TEXT_TOP - GUIDE_TEXT_BOTTOM,
  );
  wrap(context, guide.text, width, fit.size)
    .slice(0, fit.lines)
    .forEach((line, index) =>
      text(
        context,
        line,
        textX,
        rect.y + GUIDE_TEXT_TOP + index * fit.gap,
        fit.size,
        INK,
      ),
    );
  if (guide.progress > 0) {
    context.fillStyle = guide.accent;
    context.fillRect(
      rect.x + 2,
      rect.y + rect.h - 6,
      Math.round((rect.w - 4) * Math.min(1, guide.progress)),
      4,
    );
  }
}

export function drawLevelUp(
  context: CanvasRenderingContext2D,
  state: ArenaState,
  hover: number,
  guide: LevelUpGuide | null = null,
): void {
  fillBehindPopup(context, "rgba(8, 10, 18, 0.62)");
  const middle = WIDE_STAGE.width / 2;
  const title = t("levelUp.title", { level: state.level });
  if (guide) {
    text(context, title, middle, 28, fitSize(context, title, WIDE_STAGE.width - 40, 46), GOLD, "center");
    drawGuideStrip(context, guide);
  } else {
    text(context, title, middle, 92, fitSize(context, title, WIDE_STAGE.width - 40, 60), GOLD, "center");
    const hint = t("levelUp.hint");
    text(context, hint, middle, 166, fitSize(context, hint, WIDE_STAGE.width - 40, 20), "#9fb0d0", "center");
  }
  const rects = cardRects(state.cards.length);
  state.cards.forEach((card, index) => {
    const rect = rects[index];
    if (rect) {
      drawCard(context, card, rect, index, hover === index);
    }
  });
  drawButton(
    context,
    rerollRect(),
    t("levelUp.reroll", { count: state.rerolls }),
    state.rerolls > 0,
  );
  drawButton(
    context,
    skipRect(),
    t("levelUp.skip", { count: state.skips }),
    state.skips > 0,
  );
}

export function guideAccent(card: Card): string {
  return cardAccent(card);
}

function reelCard(spin: ChestSpin, slot: number): Card {
  return slot >= REEL_SLOTS - 1
    ? spin.prize
    : (spin.reel[slot % Math.max(1, spin.reel.length)] ?? spin.prize);
}

function cardIcon(card: Card): HTMLCanvasElement {
  return card.kind === "restore"
    ? cachedIcon("restore", RESTORE_ICON)
    : card.kind === "passive"
      ? passiveIcon(card.id)
      : weaponIcon(card.id);
}

export function drawChestSpin(
  context: CanvasRenderingContext2D,
  spin: ChestSpin,
  frame: number,
): void {
  fillBehindPopup(context, "rgba(8, 10, 18, 0.62)");
  const stage = WIDE_STAGE;
  const middle = stage.width / 2;
  const top = 0;
  const landed = spin.age >= CHEST_SPIN_FRAMES;
  const progress = Math.min(1, spin.age / CHEST_SPIN_FRAMES);
  const eased = 1 - (1 - progress) ** 3;
  const position = eased * (REEL_SLOTS - 1);
  const title = t("chest.title");
  const hint = t("chest.hint");
  text(context, title, middle, top + 70, fitSize(context, title, stage.width - 40, 60), GOLD, "center");
  text(context, hint, middle, top + 142, fitSize(context, hint, stage.width - 40, 20), "#9fb0d0", "center");
  const machine = { x: middle - 190, y: top + 186, w: 380, h: 420 };
  context.fillStyle = SHADOW;
  context.fillRect(
    machine.x - 8,
    machine.y - 8,
    machine.w + 16,
    machine.h + 16,
  );
  context.fillStyle =
    landed && Math.floor(frame / 6) % 2 === 0 ? GOLD : "#b86f50";
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
  const reelWindow = {
    x: machine.x + 40,
    y: machine.y + 40,
    w: machine.w - 80,
    h: machine.h - 80,
  };
  context.fillStyle = CARD_INSET;
  context.fillRect(reelWindow.x, reelWindow.y, reelWindow.w, reelWindow.h);
  const centerY = reelWindow.y + reelWindow.h / 2;
  context.save();
  context.beginPath();
  context.rect(reelWindow.x, reelWindow.y, reelWindow.w, reelWindow.h);
  context.clip();
  const first = Math.max(0, Math.floor(position) - 2);
  for (
    let slot = first;
    slot <= Math.min(REEL_SLOTS - 1, first + 4);
    slot += 1
  ) {
    const y = centerY + (slot - position) * REEL_SLOT_HEIGHT;
    const card = reelCard(spin, slot);
    const tile = {
      x: reelWindow.x + reelWindow.w / 2 - 56,
      y: y - 56,
      w: 112,
      h: 112,
    };
    context.globalAlpha = Math.max(0.25, 1 - Math.abs(slot - position) * 0.55);
    iconTile(context, tile, cardAccent(card));
    drawIcon(
      context,
      cardIcon(card),
      tile.x + tile.w / 2,
      tile.y + tile.h / 2 - 2,
      96,
    );
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
    text(
      context,
      name,
      middle,
      top + 640,
      fitSize(context, name, Math.min(900, stage.width - 40), 40),
      INK,
      "center",
    );
    const badge =
      card.kind === "evolve"
        ? t("card.evolve")
        : card.kind === "restore"
          ? t("card.restore.kind")
          : card.toLevel === 1
            ? t("card.new")
            : t("card.levelChange", {
                from: card.toLevel - 1,
                to: card.toLevel,
              });
    text(context, badge, middle, top + 698, fitSize(context, badge, stage.width - 40, 24), cardAccent(card), "center");
  }
}

function drawButton(
  context: CanvasRenderingContext2D,
  rect: Rect,
  label: string,
  enabled: boolean,
): void {
  context.globalAlpha = enabled ? 1 : 0.4;
  panel(context, rect);
  const size = fitSize(context, label, rect.w - 24, 20);
  text(
    context,
    label,
    rect.x + rect.w / 2,
    rect.y + 30 - size / 2,
    size,
    INK,
    "center",
  );
  context.globalAlpha = 1;
}

function cardAccent(card: Card): string {
  return card.kind === "evolve"
    ? GOLD
    : card.kind === "weapon"
      ? WEAPON_ACCENT
      : card.kind === "restore"
        ? RESTORE_ACCENT
        : PASSIVE_ACCENT;
}

function cardMaxLevel(card: Card): number {
  return card.kind === "restore"
    ? 0
    : card.kind === "passive"
      ? PASSIVES[card.id].maxLevel
      : WEAPONS[card.id].levels.length;
}

function drawPips(
  context: CanvasRenderingContext2D,
  card: Card,
  centerX: number,
  y: number,
): void {
  const count = cardMaxLevel(card);
  const size = 14;
  const gap = 6;
  const left = centerX - (count * size + (count - 1) * gap) / 2;
  for (let index = 0; index < count; index += 1) {
    const x = left + index * (size + gap);
    context.fillStyle = SHADOW;
    context.fillRect(x - 2, y - 2, size + 4, size + 4);
    const level = index + 1;
    context.fillStyle =
      level < card.toLevel
        ? cardAccent(card)
        : level === card.toLevel
          ? INK
          : TILE;
    context.fillRect(x, y, size, size);
  }
}

function drawCard(
  context: CanvasRenderingContext2D,
  card: Card,
  rect: Rect,
  index: number,
  hovered: boolean,
): void {
  const lift = hovered ? -12 : 0;
  const box = { ...rect, y: rect.y + lift };
  const accent = cardAccent(card);
  context.fillStyle = SHADOW;
  context.fillRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
  context.fillStyle = hovered
    ? accent
    : card.recommended
      ? "#a7f070"
      : PANEL_EDGE;
  context.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
  context.fillStyle = CARD_FACE;
  context.fillRect(box.x, box.y, box.w, box.h);
  context.fillStyle = accent;
  context.fillRect(box.x, box.y, box.w, 40);
  const kindLabel =
    card.kind === "evolve"
      ? t("card.evolve")
      : card.kind === "weapon"
        ? t("card.weapon")
        : card.kind === "restore"
          ? t("card.restore.kind")
          : t("card.passive");
  const tagSize = 18;
  const tagY = box.y + 11;
  text(context, kindLabel, box.x + 18, tagY, tagSize, SHADOW);
  const badge =
    card.kind === "evolve" || card.kind === "restore"
      ? "★"
      : card.toLevel === 1
        ? t("card.new")
        : t("card.levelChange", { from: card.toLevel - 1, to: card.toLevel });
  text(context, badge, box.x + box.w - 18, tagY, tagSize, SHADOW, "right");
  if (card.recommended) {
    const label = t("card.recommended");
    const width = Math.min(box.w - 20, measure(context, label, 15) + 24);
    context.fillStyle = SHADOW;
    context.fillRect(
      box.x + box.w / 2 - width / 2 - 3,
      box.y - 31,
      width + 6,
      32,
    );
    context.fillStyle = "#a7f070";
    context.fillRect(box.x + box.w / 2 - width / 2, box.y - 28, width, 26);
    text(context, label, box.x + box.w / 2, box.y - 23, 15, SHADOW, "center");
  }
  drawCardBody(context, card, box, accent);
  const key = {
    x: box.x + box.w / 2 - 18,
    y: box.y + box.h - 14,
    w: 36,
    h: 30,
  };
  context.fillStyle = SHADOW;
  context.fillRect(key.x - 3, key.y - 3, key.w + 6, key.h + 6);
  context.fillStyle = hovered ? accent : TILE_LIGHT;
  context.fillRect(key.x, key.y, key.w, key.h);
  text(
    context,
    String(index + 1),
    key.x + key.w / 2,
    key.y + 6,
    18,
    hovered ? SHADOW : INK,
    "center",
  );
}

function drawCardBody(context: CanvasRenderingContext2D, card: Card, box: Rect, accent: string): void {
  const tile = { x: box.x + box.w / 2 - 56, y: box.y + 58, w: 112, h: 112 };
  iconTile(context, tile, accent);
  drawIcon(
    context,
    cardIcon(card),
    tile.x + tile.w / 2,
    tile.y + tile.h / 2 - 2,
    96,
  );
  const name = cardName(card);
  text(
    context,
    name,
    box.x + box.w / 2,
    box.y + 186,
    fitSize(context, name, box.w - 32, 26),
    INK,
    "center",
  );
  if (card.kind !== "evolve" && card.kind !== "restore") {
    drawPips(context, card, box.x + box.w / 2, box.y + 222);
  }
  wrap(context, cardBlurb(card), box.w - 40, 15)
    .slice(0, 2)
    .forEach((line, lineIndex) =>
      text(
        context,
        line,
        box.x + box.w / 2,
        box.y + 248 + lineIndex * 21,
        15,
        "#c8cfe0",
        "center",
      ),
    );
  const inset = {
    x: box.x + 14,
    y: box.y + 298,
    w: box.w - 28,
    h: box.h - 312,
  };
  context.fillStyle = CARD_INSET;
  context.fillRect(inset.x, inset.y, inset.w, inset.h);
  card.changes.slice(0, 3).forEach((change, lineIndex) => {
    const y = inset.y + 10 + lineIndex * 24;
    text(context, changeLabel(change), inset.x + 12, y, 15, "#9fb0d0");
    text(
      context,
      `${changeValue(change, change.before)} ▸ ${changeValue(change, change.after)}`,
      inset.x + inset.w - 12,
      y,
      15,
      accent,
      "right",
    );
  });
}

interface PauseLayout {
  readonly titleY: number;
  readonly keysY: number;
  readonly build: Rect;
  readonly stats: Rect;
  readonly weaponTop: number;
  readonly weaponStep: number;
  readonly passiveTop: number;
  readonly passiveStep: number;
  readonly passiveColumns: number;
  readonly statTop: number;
  readonly statStep: number;
  readonly statSize: number;
  readonly quit: Rect;
}

const WIDE_PAUSE: PauseLayout = {
  titleY: 70,
  keysY: 140,
  build: { x: 160, y: 200, w: 540, h: 520 },
  stats: { x: 740, y: 200, w: 540, h: 520 },
  weaponTop: 80,
  weaponStep: 46,
  passiveTop: 330,
  passiveStep: 32,
  passiveColumns: 1,
  statTop: 80,
  statStep: 40,
  statSize: 18,
  quit: { x: 540, y: 736, w: 360, h: 58 },
};

function pauseLayout(): PauseLayout {
  return WIDE_PAUSE;
}

export function pauseQuitRect(): Rect {
  return pauseLayout().quit;
}

export function drawPause(
  context: CanvasRenderingContext2D,
  state: ArenaState,
): void {
  fillBehindPopup(context, "rgba(8, 10, 18, 0.78)");
  const layout = pauseLayout();
  const middle = WIDE_STAGE.width / 2;
  const room = WIDE_STAGE.width - 40;
  const title = t("pause.title");
  const keys = t("pause.keys");
  text(context, title, middle, layout.titleY, fitSize(context, title, room, 52), GOLD, "center");
  text(context, keys, middle, layout.keysY, fitSize(context, keys, room, 18), "#9fb0d0", "center");
  const left = layout.build;
  const right = layout.stats;
  panel(context, left);
  panel(context, right);
  text(context, t("pause.build"), left.x + 28, left.y + 24, 26, GOLD);
  const seconds = Math.max(1, elapsedSeconds(state));
  state.weapons.forEach((owned, index) => {
    const y = left.y + layout.weaponTop + index * layout.weaponStep;
    const damage = state.damageByWeapon.get(owned.id) ?? 0;
    const dps = t("pause.dps", { dps: Math.round(damage / seconds) });
    const name = isEvolvedWeapon(owned.id)
      ? `${weaponName(owned.id)} ★`
      : t("pause.partLevel", {
          name: weaponName(owned.id),
          level: owned.level,
        });
    const nameRoom = left.w - 72 - measure(context, dps, 18);
    text(context, name, left.x + 28, y, fitSize(context, name, nameRoom, 18));
    text(context, dps, left.x + left.w - 28, y, 18, "#a7f070", "right");
  });
  const columnWidth = (left.w - 56) / layout.passiveColumns;
  [...state.passives].forEach(([id, owned], index) => {
    const column = index % layout.passiveColumns;
    const row = Math.floor(index / layout.passiveColumns);
    const label = t("pause.partLevel", { name: passiveName(id), level: owned });
    text(
      context,
      label,
      left.x + 28 + column * columnWidth,
      left.y + layout.passiveTop + row * layout.passiveStep,
      fitSize(context, label, columnWidth - 12, 16),
      "#c8cfe0",
    );
  });
  text(context, t("pause.stats"), right.x + 28, right.y + 24, 26, GOLD);
  const stats: [string, string][] = [
    [t("stat.maxHealth"), String(maxHealth(state))],
    [t("stat.hallucination"), `${hallucinationPercent(state)}%`],
    [t("stat.crit"), `${critPercent(state)}%`],
    [t("stat.damageBonus"), `+${statTotal(state, "damage")}%`],
    [t("stat.cooldown"), `${statTotal(state, "cooldown")}%`],
    [t("stat.speed"), `${playerSpeed(state)}`],
    [
      t("stat.pickup"),
      t("unit.pixels", { value: Math.round(pickupRadius(state) / 16) }),
    ],
    [t("stat.armor"), String(statTotal(state, "armor"))],
    [t("stat.rerolls"), String(state.rerolls)],
    [t("stat.seed"), `#${state.seed}`],
  ];
  stats.forEach(([label, value], index) => {
    const y = right.y + layout.statTop + index * layout.statStep;
    text(context, label, right.x + 28, y, layout.statSize, "#c8cfe0");
    text(context, value, right.x + right.w - 28, y, layout.statSize, INK, "right");
  });
  drawButton(context, layout.quit, t("pause.quit"), true);
}

interface ResultsLayout {
  readonly titleY: number;
  readonly lineY: number;
  readonly mismatchY: number;
  readonly summary: Rect;
  readonly damage: Rect;
  readonly rowTop: number;
  readonly rowStep: number;
  readonly rowSize: number;
  readonly damageTop: number;
  readonly damageStep: number;
  readonly share: Rect;
  readonly post: Rect;
  readonly watch: Rect;
  readonly keysY: number;
  readonly linkY: number;
}

const WIDE_RESULTS: ResultsLayout = {
  titleY: 60,
  lineY: 124,
  mismatchY: 158,
  summary: { x: 160, y: 190, w: 540, h: 470 },
  damage: { x: 740, y: 190, w: 540, h: 470 },
  rowTop: 32,
  rowStep: 58,
  rowSize: 20,
  damageTop: 80,
  damageStep: 52,
  share: { x: 234, y: 678, w: 300, h: 56 },
  post: { x: 570, y: 678, w: 300, h: 56 },
  watch: { x: 906, y: 678, w: 300, h: 56 },
  keysY: 748,
  linkY: 780,
};

function resultsLayout(): ResultsLayout {
  return WIDE_RESULTS;
}

export function shareRect(): Rect {
  return resultsLayout().share;
}

export function postRect(): Rect {
  return resultsLayout().post;
}

export function watchRect(): Rect {
  return resultsLayout().watch;
}

export interface ResultsView {
  readonly replay: boolean;
  readonly mismatch: boolean;
  readonly shareReady: boolean;
}

export function drawResults(
  context: CanvasRenderingContext2D,
  state: ArenaState,
  view: ResultsView,
): void {
  fillBehindPopup(context, "rgba(8, 10, 18, 0.84)");
  const layout = resultsLayout();
  const middle = stageWidth() / 2;
  const room = stageWidth() - 40;
  const won = state.status === "won";
  const title = won ? t("results.wonTitle") : t("results.lostTitle");
  text(context, title, middle, layout.titleY, fitSize(context, title, room, 46), won ? GOLD : "#ff9b9b", "center");
  const line = won
    ? t("results.wonLine")
    : t("results.killedBy", { killer: killerName(state.killedBy) });
  text(context, line, middle, layout.lineY, fitSize(context, line, room, 20), INK, "center");
  const left = layout.summary;
  const right = layout.damage;
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
    const y = left.y + layout.rowTop + index * layout.rowStep;
    text(context, label, left.x + 28, y, layout.rowSize, "#c8cfe0");
    const valueRoom = left.w - 72 - measure(context, label, layout.rowSize);
    text(context, value, left.x + left.w - 28, y, fitSize(context, value, valueRoom, layout.rowSize), INK, "right");
  });
  text(
    context,
    t("results.damageByPart"),
    right.x + 28,
    right.y + 28,
    22,
    GOLD,
  );
  const total =
    [...state.damageByWeapon.values()].reduce((sum, value) => sum + value, 0) ||
    1;
  [...state.damageByWeapon]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .forEach(([id, damage], index) => {
      const y = right.y + layout.damageTop + index * layout.damageStep;
      text(context, weaponName(id), right.x + 28, y, 16, INK);
      text(
        context,
        compact(damage),
        right.x + right.w - 28,
        y,
        16,
        "#a7f070",
        "right",
      );
      bar(
        context,
        { x: right.x + 28, y: y + 26, w: right.w - 56, h: 10 },
        damage / total,
        "#41a6f6",
      );
    });
  drawButton(context, layout.share, t("share.button"), view.shareReady);
  drawButton(context, layout.post, t("share.x"), view.shareReady);
  drawButton(
    context,
    layout.watch,
    view.replay ? t("replay.again") : t("replay.watch"),
    true,
  );
  const keys = view.replay ? t("replay.keys") : t("results.keys");
  text(context, keys, middle, layout.keysY, fitSize(context, keys, room, 18), GOLD, "center");
  const link = t("mastra.link");
  text(context, link, middle, layout.linkY, fitSize(context, link, room, 14), "#9fb0d0", "center");
  if (view.mismatch) {
    const mismatch = t("replay.mismatch");
    text(context, mismatch, middle, layout.mismatchY, fitSize(context, mismatch, room, 16), "#ff9b9b", "center");
  }
}

function stageWidth(): number {
  return WIDE_STAGE.width;
}

export function drawReplayTag(
  context: CanvasRenderingContext2D,
  label: string,
): void {
  const size = 18;
  const width = measure(context, label, size) + 32;
  const v = currentView();
  const rect = { x: v.width - v.safe.right - 24 - width, y: v.safe.top + 96, w: width, h: 36 };
  context.fillStyle = SHADOW;
  context.fillRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
  context.fillStyle = "#e43b44";
  context.fillRect(rect.x, rect.y, rect.w, rect.h);
  text(context, label, rect.x + rect.w / 2, rect.y + 9, size, INK, "center");
}

export function drawReplayHud(
  context: CanvasRenderingContext2D,
  speed: number,
): void {
  drawReplayTag(context, t("replay.speed", { speed }));
  const v = currentView();
  const hint = t("replay.hint");
  text(context, hint, v.width - v.safe.right - 24, v.safe.top + 142, fitSize(context, hint, v.width - 48, 15), "#9fb0d0", "right");
}

export function drawNotice(
  context: CanvasRenderingContext2D,
  notice: string,
  alpha: number,
): void {
  const v = currentView();
  const size = fitSize(context, notice, v.width - v.safe.left - v.safe.right - 72, 20);
  const width = measure(context, notice, size) + 48;
  const rect = { x: v.width / 2 - width / 2, y: v.safe.top + 18, w: width, h: 48 };
  context.globalAlpha = Math.max(0, Math.min(1, alpha));
  panel(context, rect, GOLD);
  text(context, notice, v.width / 2, rect.y + 24 - size / 2, size, INK, "center");
  context.globalAlpha = 1;
}

export function inside(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
  );
}

export interface BossEntranceView {
  readonly label: string;
  readonly name: string;
  readonly company: string;
  readonly portrait: HTMLCanvasElement;
  readonly age: number;
}

export const ENTRANCE_SECONDS = 2.2;
export const ENTRANCE_SLAM_SECONDS = 0.42;
const ENTRANCE_RED = "#ff4d5e";

export function bossEntranceAlpha(age: number): number {
  const fadeIn = Math.min(1, age / 0.12);
  const fadeOut = Math.min(1, Math.max(0, (ENTRANCE_SECONDS - age) / 0.35));
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

export function drawBossEntrance(context: CanvasRenderingContext2D, view: BossEntranceView): void {
  const alpha = bossEntranceAlpha(view.age);
  if (alpha <= 0) {
    return;
  }
  const slide = 1 - (1 - Math.min(1, view.age / 0.3)) ** 3;
  const slam = Math.min(1, Math.max(0, (view.age - 0.2) / (ENTRANCE_SLAM_SECONDS - 0.2)));
  const screen = currentView();
  const width = screen.width;
  const band = { x: 0, y: screen.safe.top + (screen.portrait ? 236 : 150), w: width, h: 190 };
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = "rgba(18, 6, 12, 0.9)";
  context.fillRect(band.x, band.y, band.w, band.h);
  context.fillStyle = ENTRANCE_RED;
  const stripe = Math.round((1 - slide) * width);
  context.fillRect(-stripe, band.y, width, 6);
  context.fillRect(stripe, band.y + band.h - 6, width, 6);
  for (let x = -40 + ((view.age * 160) % 40); x < width; x += 40) {
    context.fillStyle = "rgba(255, 77, 94, 0.08)";
    context.beginPath();
    context.moveTo(x, band.y + 6);
    context.lineTo(x + 20, band.y + 6);
    context.lineTo(x + 20 - 60, band.y + band.h - 6);
    context.lineTo(x - 60, band.y + band.h - 6);
    context.fill();
  }
  const box = 150;
  const boxX = Math.max(screen.safe.left + 16, width / 2 - 380) - Math.round((1 - slide) * 500);
  const boxY = band.y + (band.h - box) / 2;
  context.fillStyle = "#2a1420";
  context.fillRect(boxX, boxY, box, box);
  context.imageSmoothingEnabled = false;
  const art = view.portrait;
  const scale = Math.max(1, Math.floor((box - 12) / Math.max(art.width, art.height)));
  const w = art.width * scale;
  const h = art.height * scale;
  context.drawImage(art, boxX + (box - w) / 2, boxY + box - 6 - h, w, h);
  context.strokeStyle = ENTRANCE_RED;
  context.lineWidth = 4;
  context.strokeRect(boxX + 2, boxY + 2, box - 4, box - 4);
  const textX = boxX + box + (screen.portrait ? 20 : 36) + Math.round((1 - slide) * 900);
  const room = width - screen.safe.right - 16 - (boxX + box + (screen.portrait ? 20 : 36));
  text(context, view.label, textX, band.y + 30, fitSize(context, view.label, room, 20), ENTRANCE_RED);
  const restSize = fitSize(context, view.name, room, 58);
  const nameSize = Math.round(restSize * (1 + 0.7 * (1 - slam)));
  context.globalAlpha = alpha * (0.35 + 0.65 * slam);
  text(context, view.name, textX, band.y + 62 + Math.round((58 - restSize) / 2) - Math.round((nameSize - restSize) / 2), nameSize, INK);
  context.globalAlpha = alpha;
  text(context, view.company, textX, band.y + 136, fitSize(context, view.company, room, 24), "#ffb3b3");
  if (slam >= 1 && view.age < ENTRANCE_SLAM_SECONDS + 0.12) {
    context.fillStyle = "rgba(255, 255, 255, 0.25)";
    context.fillRect(band.x, band.y, band.w, band.h);
  }
  context.restore();
}
