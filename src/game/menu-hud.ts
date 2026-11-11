import { WORLD_LOOKS } from "../art/world-looks";
import { WORLDS } from "../sim/arena/content";
import { HEAD_START_CARDS_PER_WORLD } from "../sim/arena/sim";
import { currentLocale, localeName, t, usesSpaces, type MessageKey } from "../i18n";
import { bossName, rivalName, tierStage } from "./format";
import { fitSize, HUD_HEIGHT, HUD_WIDTH, measure, text, wrapLines, type Rect } from "./hud";
import { CONTROLS_PANEL, CREDITS_PANEL, Menu, menuRect, MENU_RECTS, SETTINGS_PANEL, VOLUME_BAR, VOLUME_STEPS, WORLD_CARD, type MenuItem, type MenuPage } from "./menu";
import { bossCanvas } from "./portraits";

export type MenuDevice = "keys" | "touch" | "pad";

const INK = "#f4f1e8";
const DIM = "#c7c9d1";
const MUTED = "#8b93ad";
const TITLE_INK = "#fff59d";
const GOLD = "#ffcd75";
const EDGE = "#ffe082";
const SURFACE = "#2b2f3a";
const SURFACE_HOT = "#3b4152";
const PRIMARY = "#ff7043";
const PRIMARY_DEEP = "#c2421f";
const PRIMARY_INK = "#1a1426";
const SCRIM = "rgba(10, 12, 18, 0.86)";
const SHADE = "#0a0c12";
const GOOD = "#a7f070";
const LOCK = "#ff8a80";

type Bitmap = readonly string[];

const STEPPER_LABEL_WIDTH = 226;

const ICONS: Readonly<Record<"gear" | "help" | "star" | "lock" | "check" | "play" | "link" | "keys" | "pad" | "touch" | "sound" | "music" | "globe" | "arrow", Bitmap>> = {
  gear: [" # # # ", "#######", " ## ## ", "##   ##", " ## ## ", "#######", " # # # "],
  help: [" ##### ", "##   ##", "    ## ", "   ##  ", "   ##  ", "       ", "   ##  "],
  star: ["   #   ", "  ###  ", "#######", " ##### ", "  ###  ", " ## ## ", "##   ##"],
  lock: ["  ###  ", " #   # ", " #   # ", "#######", "### ###", "### ###", "#######"],
  check: ["      #", "     ##", "#   ## ", "## ##  ", " ###   ", "  #    ", "       "],
  play: ["##     ", "####   ", "###### ", "#######", "###### ", "####   ", "##     "],
  link: ["   ####", "     ##", "    # #", "   #  #", "  #    ", "##     ", "##     "],
  keys: ["#######", "# # # #", "#######", "## # ##", "#######", "#     #", "#######"],
  pad: [" ##### ", "#######", "# ### #", "#######", "### ###", "##   ##", "#     #"],
  touch: ["  #    ", "  #    ", "  ###  ", "  #####", "#######", " ######", "  #### "],
  sound: ["   #   ", "  ##  #", "####  #", "#### # ", "####  #", "  ##  #", "   #   "],
  music: ["   ####", "   #  #", "   #  #", "   #  #", " ###### ", "####### ", " ##  ## "],
  globe: [" ##### ", "# # # #", "#######", "# # # #", "#######", "# # # #", " ##### "],
  arrow: ["  #    ", "   #   ", "    #  ", "#######", "    #  ", "   #   ", "  #    "],
};

function icon(context: CanvasRenderingContext2D, bitmap: Bitmap, x: number, y: number, cell: number, color: string): void {
  context.fillStyle = SHADE;
  bitmap.forEach((row, rowIndex) =>
    [...row].forEach((pixel, column) => {
      if (pixel === "#") {
        context.fillRect(x + column * cell + 2, y + rowIndex * cell + 2, cell, cell);
      }
    }),
  );
  context.fillStyle = color;
  bitmap.forEach((row, rowIndex) =>
    [...row].forEach((pixel, column) => {
      if (pixel === "#") {
        context.fillRect(x + column * cell, y + rowIndex * cell, cell, cell);
      }
    }),
  );
}

function ease(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return 1 - (1 - clamped) ** 3;
}

function chunky(context: CanvasRenderingContext2D, rect: Rect, fill: string, edge: string, lip: string): void {
  context.fillStyle = SHADE;
  context.fillRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 9);
  context.fillStyle = lip;
  context.fillRect(rect.x, rect.y + rect.h - 6, rect.w, 6);
  context.fillStyle = fill;
  context.fillRect(rect.x, rect.y, rect.w, rect.h - 6);
  context.fillStyle = edge;
  context.fillRect(rect.x, rect.y, rect.w, 3);
  context.fillRect(rect.x, rect.y, 3, rect.h - 6);
}

function focusRing(context: CanvasRenderingContext2D, rect: Rect, frame: number): void {
  const pulse = 0.55 + 0.45 * Math.sin(frame / 7);
  const gap = 6 + Math.round(pulse * 2);
  context.save();
  context.shadowColor = "rgba(255, 224, 130, 0.65)";
  context.shadowBlur = 14 + pulse * 8;
  context.strokeStyle = TITLE_INK;
  context.lineWidth = 3;
  context.strokeRect(rect.x - gap, rect.y - gap, rect.w + gap * 2, rect.h + gap * 2 + 3);
  context.restore();
  context.fillStyle = TITLE_INK;
  const corner = 12;
  for (const [cx, cy, sx, sy] of [
    [rect.x - gap - 4, rect.y - gap - 4, 1, 1],
    [rect.x + rect.w + gap + 4, rect.y - gap - 4, -1, 1],
    [rect.x - gap - 4, rect.y + rect.h + gap + 7, 1, -1],
    [rect.x + rect.w + gap + 4, rect.y + rect.h + gap + 7, -1, -1],
  ] as const) {
    context.fillRect(sx > 0 ? cx : cx - corner, sy > 0 ? cy : cy - 4, corner, 4);
    context.fillRect(sx > 0 ? cx : cx - 4, sy > 0 ? cy : cy - corner, 4, corner);
  }
}

function pressOffset(menu: Menu, item: MenuItem): number {
  return menu.pressed?.item === item ? Math.round(4 * (1 - menu.pressed.age / 8)) : 0;
}

function menuButton(
  context: CanvasRenderingContext2D,
  menu: Menu,
  item: MenuItem,
  label: string,
  glyph: Bitmap | null,
  frame: number,
  rect: Rect = menuRect(menu.page, item),
): void {
  const focused = menu.focus === item;
  const down = pressOffset(menu, item);
  const at = { ...rect, y: rect.y + down };
  chunky(context, at, focused ? SURFACE_HOT : SURFACE, focused ? EDGE : "#4a5068", "#1c1f28");
  if (focused) {
    focusRing(context, at, frame);
  }
  const textX = glyph ? at.x + 72 : at.x + at.w / 2;
  if (glyph) {
    icon(context, glyph, at.x + 22, at.y + (at.h - 6) / 2 - 14, 4, focused ? TITLE_INK : EDGE);
  }
  const size = fitSize(context, label, at.w - (glyph ? 96 : 32), 26);
  text(context, label, textX, at.y + (at.h - 6) / 2 - size / 2, size, focused ? TITLE_INK : INK, glyph ? "left" : "center");
}

function chevron(context: CanvasRenderingContext2D, rect: Rect, direction: 1 | -1, enabled: boolean, hot: boolean, frame: number): void {
  context.globalAlpha = enabled ? 1 : 0.3;
  chunky(context, rect, hot ? SURFACE_HOT : SURFACE, hot ? EDGE : "#4a5068", "#1c1f28");
  const nudge = enabled && hot ? Math.round(Math.sin(frame / 5) * 3) * direction : 0;
  const cx = rect.x + rect.w / 2 + nudge;
  const cy = rect.y + (rect.h - 6) / 2;
  context.fillStyle = hot ? TITLE_INK : EDGE;
  for (let row = -4; row <= 4; row += 1) {
    const span = 5 - Math.abs(row);
    context.fillRect(direction > 0 ? cx - 8 : cx + 8 - span * 4, cy + row * 4, span * 4, 4);
  }
  context.globalAlpha = 1;
}

function silhouette(art: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = art.width;
  canvas.height = art.height;
  const context = canvas.getContext("2d");
  if (context) {
    context.drawImage(art, 0, 0);
    context.globalCompositeOperation = "source-in";
    context.fillStyle = "#0c0e16";
    context.fillRect(0, 0, art.width, art.height);
  }
  return canvas;
}

const shadows = new Map<string, HTMLCanvasElement>();

function bossArt(world: number, locked: boolean): HTMLCanvasElement | null {
  const entry = WORLDS[world];
  if (!entry) {
    return null;
  }
  const art = bossCanvas(entry.id);
  if (!locked) {
    return art;
  }
  let dark = shadows.get(entry.id);
  if (!dark) {
    dark = silhouette(art);
    shadows.set(entry.id, dark);
  }
  return dark;
}

function drawLogo(context: CanvasRenderingContext2D, frame: number): void {
  const title = t("game.title");
  const size = fitSize(context, title, 820, 84);
  let x = 72;
  const letters = [...title];
  letters.forEach((letter, index) => {
    const width = measure(context, letter, size);
    const bob = Math.round(Math.sin(frame / 14 + index * 0.55) * 4);
    context.font = `${size}px "Silkscreen", "DotGothic16", ui-monospace, monospace`;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillStyle = "#3a2410";
    context.fillText(letter, x + 6, 56 + bob + 8);
    context.fillStyle = PRIMARY_DEEP;
    context.fillText(letter, x + 3, 56 + bob + 4);
    context.fillStyle = index % 2 === 0 ? TITLE_INK : GOLD;
    context.fillText(letter, x, 56 + bob);
    x += width;
  });
  const lines = wrapLines(t("title.tagline"), 760, usesSpaces(currentLocale()), (line) => measure(context, line, 20));
  lines.slice(0, 2).forEach((line, index) => text(context, line, 74, 170 + index * 30, 20, DIM));
}

function drawWorldCard(context: CanvasRenderingContext2D, menu: Menu, frame: number): void {
  const world = WORLDS[menu.world];
  if (!world) {
    return;
  }
  const look = WORLD_LOOKS[world.tier];
  const locked = menu.locked();
  const swap = menu.swap;
  const slide = swap ? (1 - ease(swap.age / 14)) * 70 * swap.direction : 0;
  const shake = menu.shake > 0 ? Math.round(Math.sin(menu.shake * 1.7) * menu.shake * 0.9) : 0;
  const card = { ...WORLD_CARD, x: WORLD_CARD.x + shake };
  context.fillStyle = SHADE;
  context.fillRect(card.x - 4, card.y - 4, card.w + 8, card.h + 12);
  context.fillStyle = SCRIM;
  context.fillRect(card.x, card.y, card.w, card.h);
  context.fillStyle = locked ? "#4a5068" : look.faction;
  context.fillRect(card.x, card.y, card.w, 6);
  context.fillRect(card.x, card.y + card.h - 4, card.w, 4);
  context.save();
  context.beginPath();
  context.rect(card.x, card.y, card.w, card.h);
  context.clip();
  context.globalAlpha = swap ? Math.min(1, 0.25 + swap.age / 10) : 1;
  const inner = card.x + slide;
  text(context, t("menu.world", { world: menu.world + 1, count: WORLDS.length }), inner + 22, card.y + 22, 22, locked ? MUTED : look.faction);
  text(context, tierStage(world.tier), inner + card.w - 22, card.y + 24, 18, MUTED, "right");
  const stage = { x: inner + 22, y: card.y + 62, w: card.w - 44, h: 250 };
  context.save();
  context.beginPath();
  context.rect(stage.x, stage.y, stage.w, stage.h);
  context.clip();
  context.fillStyle = locked ? "#1a1d27" : look.ground[2];
  context.fillRect(stage.x, stage.y, stage.w, stage.h);
  for (let gy = 0; gy < stage.h; gy += 10) {
    for (let gx = (gy / 10) % 2 === 0 ? 0 : 10; gx < stage.w; gx += 20) {
      context.fillStyle = locked ? "#20242f" : look.ground[0];
      context.fillRect(stage.x + gx, stage.y + gy, 10, 10);
    }
  }
  const glow = context.createRadialGradient(stage.x + stage.w / 2, stage.y + stage.h * 0.62, 10, stage.x + stage.w / 2, stage.y + stage.h * 0.62, stage.w * 0.6);
  glow.addColorStop(0, locked ? "rgba(255,138,128,0.12)" : "rgba(255,245,157,0.28)");
  glow.addColorStop(1, "rgba(10,12,18,0.55)");
  context.fillStyle = glow;
  context.fillRect(stage.x, stage.y, stage.w, stage.h);
  const art = bossArt(menu.world, locked);
  if (art) {
    const scale = Math.max(1, Math.floor(Math.min((stage.w - 40) / art.width, (stage.h - 30) / art.height)));
    const w = art.width * scale;
    const h = art.height * scale;
    const bob = locked ? 0 : Math.round(Math.sin(frame / 18) * 3);
    context.fillStyle = "rgba(0,0,0,0.35)";
    context.beginPath();
    context.ellipse(stage.x + stage.w / 2, stage.y + stage.h - 18, w * 0.38, 9, 0, 0, Math.PI * 2);
    context.fill();
    context.imageSmoothingEnabled = false;
    context.drawImage(art, Math.round(stage.x + (stage.w - w) / 2), Math.round(stage.y + stage.h - 18 - h + bob), w, h);
  }
  context.restore();
  if (locked) {
    icon(context, ICONS.lock, stage.x + stage.w / 2 - 28, stage.y + stage.h / 2 - 40, 8, LOCK);
  }
  context.strokeStyle = SHADE;
  context.lineWidth = 4;
  context.strokeRect(stage.x, stage.y, stage.w, stage.h);
  const rival = locked ? "? ? ?" : rivalName(world);
  const rivalSize = fitSize(context, rival, card.w - 44, 42);
  text(context, rival, inner + card.w / 2, card.y + 330, rivalSize, locked ? MUTED : INK, "center");
  const boss = t("menu.boss", { name: bossName(world) });
  text(context, boss, inner + card.w / 2, card.y + 386, fitSize(context, boss, card.w - 44, 20), DIM, "center");
  const beaten = menu.world < menu.bossesCleared;
  const statusKey: MessageKey = locked ? "menu.status.locked" : beaten ? "menu.status.beaten" : "menu.status.next";
  const status = t(statusKey, { boss: bossName(WORLDS[menu.world - 1] ?? world) });
  const statusColor = locked ? LOCK : beaten ? GOOD : GOLD;
  const statusSize = fitSize(context, status, card.w - 90, 20);
  const statusWidth = measure(context, status, statusSize) + 40;
  const statusX = inner + card.w / 2 - statusWidth / 2;
  icon(context, locked ? ICONS.lock : beaten ? ICONS.check : ICONS.star, statusX, card.y + 424, 4, statusColor);
  text(context, status, statusX + 40, card.y + 428 + (20 - statusSize) / 2, statusSize, statusColor);
  if (menu.world > 0 && !locked) {
    const head = t("menu.headStart", { cards: menu.world * HEAD_START_CARDS_PER_WORLD });
    text(context, head, inner + card.w / 2, card.y + 462, fitSize(context, head, card.w - 44, 16), MUTED, "center");
  }
  context.restore();
  const pip = 18;
  const gap = 14;
  const total = WORLDS.length * pip + (WORLDS.length - 1) * gap;
  WORLDS.forEach((entry, index) => {
    const x = card.x + card.w / 2 - total / 2 + index * (pip + gap);
    const y = card.y + card.h - 44;
    const current = index === menu.world;
    const open = index < menu.unlocked;
    context.fillStyle = SHADE;
    context.fillRect(x - 3, y - 3, pip + 6, pip + 6);
    context.fillStyle = open ? WORLD_LOOKS[entry.tier].faction : "#2b2f3a";
    context.fillRect(x, y, pip, pip);
    if (current) {
      context.strokeStyle = TITLE_INK;
      context.lineWidth = 3;
      context.strokeRect(x - 6, y - 6, pip + 12, pip + 12);
    }
  });
  const hotPrev = menu.focus === "start" || menu.focus === "worldPrev";
  chevron(context, MENU_RECTS.worldPrev, -1, menu.world > 0, hotPrev, frame);
  chevron(context, MENU_RECTS.worldNext, 1, menu.world < WORLDS.length - 1, hotPrev, frame);
}

function drawStart(context: CanvasRenderingContext2D, menu: Menu, frame: number): void {
  const rect = MENU_RECTS.start;
  const locked = menu.locked();
  const focused = menu.focus === "start";
  const down = pressOffset(menu, "start");
  const at = { ...rect, y: rect.y + down };
  const breathe = focused && !locked ? Math.round((Math.sin(frame / 9) + 1) * 2) : 0;
  const grown = { x: at.x - breathe, y: at.y - breathe, w: at.w + breathe * 2, h: at.h + breathe * 2 };
  chunky(context, grown, locked ? "#4a4f5e" : PRIMARY, locked ? "#6a7088" : "#ffab91", locked ? "#2b2f3a" : PRIMARY_DEEP);
  if (focused) {
    focusRing(context, grown, frame);
  }
  const ink = locked ? DIM : PRIMARY_INK;
  icon(context, locked ? ICONS.lock : ICONS.play, grown.x + 26, grown.y + (grown.h - 6) / 2 - 21, 6, ink);
  const label = locked ? t("menu.locked") : t("menu.start");
  const size = fitSize(context, label, grown.w - 120, 40);
  context.font = `${size}px "Silkscreen", "DotGothic16", ui-monospace, monospace`;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillStyle = locked ? SHADE : "#ffccbc";
  context.fillText(label, grown.x + 90 + 2, grown.y + (grown.h - 6) / 2 - size / 2 - 8 + 2);
  context.fillStyle = ink;
  context.fillText(label, grown.x + 90, grown.y + (grown.h - 6) / 2 - size / 2 - 8);
  const world = WORLDS[menu.world];
  if (world) {
    const sub = t("menu.startWorld", { world: menu.world + 1, rival: locked ? "?" : rivalName(world) });
    const subSize = fitSize(context, sub, grown.w - 120, 16);
    context.font = `${subSize}px "Silkscreen", "DotGothic16", ui-monospace, monospace`;
    context.fillStyle = locked ? MUTED : "#4a1a0c";
    context.fillText(sub, grown.x + 92, grown.y + (grown.h - 6) / 2 + size / 2 - 2);
  }
}

function drawHint(context: CanvasRenderingContext2D, device: MenuDevice, page: MenuPage): void {
  if (device === "touch") {
    return;
  }
  const key: MessageKey = device === "pad" ? (page === "home" ? "menu.hint.pad" : "menu.hint.padPage") : page === "home" ? "menu.hint.keys" : "menu.hint.keysPage";
  const hint = t(key);
  text(context, hint, HUD_WIDTH - 24, HUD_HEIGHT - 34, fitSize(context, hint, 820, 15), MUTED, "right");
}

function drawShade(context: CanvasRenderingContext2D): void {
  const vignette = context.createRadialGradient(HUD_WIDTH / 2, HUD_HEIGHT / 2, HUD_HEIGHT * 0.3, HUD_WIDTH / 2, HUD_HEIGHT / 2, HUD_WIDTH * 0.72);
  vignette.addColorStop(0, "rgba(8, 10, 18, 0.05)");
  vignette.addColorStop(1, "rgba(8, 10, 18, 0.7)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, HUD_WIDTH, HUD_HEIGHT);
  const left = context.createLinearGradient(0, 0, 640, 0);
  left.addColorStop(0, "rgba(8, 10, 18, 0.72)");
  left.addColorStop(1, "rgba(8, 10, 18, 0)");
  context.fillStyle = left;
  context.fillRect(0, 0, 640, HUD_HEIGHT);
}

function drawHome(context: CanvasRenderingContext2D, menu: Menu, frame: number): void {
  drawLogo(context, frame);
  drawStart(context, menu, frame);
  menuButton(context, menu, "settings", t("menu.settings"), ICONS.gear, frame);
  menuButton(context, menu, "howTo", t("menu.howTo"), ICONS.help, frame);
  menuButton(context, menu, "credits", t("menu.credits"), ICONS.star, frame);
  const mastra = MENU_RECTS.mastra;
  const focused = menu.focus === "mastra";
  if (focused) {
    focusRing(context, mastra, frame);
  }
  icon(context, ICONS.link, mastra.x + 6, mastra.y + 12, 4, focused ? TITLE_INK : EDGE);
  const label = t("mastra.link");
  text(context, label, mastra.x + 48, mastra.y + 15, fitSize(context, label, mastra.w - 56, 18), focused ? TITLE_INK : DIM);
  drawWorldCard(context, menu, frame);
}

function pagePanel(context: CanvasRenderingContext2D, rect: Rect, title: string, glyph: Bitmap): void {
  context.fillStyle = "rgba(6, 8, 14, 0.62)";
  context.fillRect(0, 0, HUD_WIDTH, HUD_HEIGHT);
  context.fillStyle = SHADE;
  context.fillRect(rect.x - 5, rect.y - 5, rect.w + 10, rect.h + 14);
  context.fillStyle = SCRIM;
  context.fillRect(rect.x, rect.y, rect.w, rect.h);
  context.fillStyle = EDGE;
  context.fillRect(rect.x, rect.y, rect.w, 4);
  context.fillStyle = "#4a5068";
  context.fillRect(rect.x, rect.y + rect.h - 4, rect.w, 4);
  icon(context, glyph, rect.x + 28, rect.y + 30, 5, EDGE);
  text(context, title, rect.x + 80, rect.y + 28, 36, TITLE_INK);
}

function settingRow(context: CanvasRenderingContext2D, menu: Menu, item: MenuItem, label: string, glyph: Bitmap, frame: number): Rect {
  const rect = MENU_RECTS[item];
  const focused = menu.focus === item;
  context.fillStyle = focused ? SURFACE_HOT : "rgba(43, 47, 58, 0.7)";
  context.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (focused) {
    focusRing(context, { ...rect, h: rect.h - 3 }, frame);
  }
  icon(context, glyph, rect.x + 18, rect.y + rect.h / 2 - 14, 4, focused ? TITLE_INK : EDGE);
  text(context, label, rect.x + 62, rect.y + rect.h / 2 - 11, fitSize(context, label, STEPPER_LABEL_WIDTH, 22), focused ? TITLE_INK : INK);
  return rect;
}

function drawVolume(context: CanvasRenderingContext2D, menu: Menu, item: "music" | "sound", frame: number): void {
  const rect = settingRow(context, menu, item, t(item === "music" ? "settings.music" : "settings.sound"), item === "music" ? ICONS.music : ICONS.sound, frame);
  const hot = menu.focus === item;
  const value = menu.settings[item];
  chevron(context, MENU_RECTS[item === "music" ? "musicDown" : "soundDown"], -1, value > 0, hot, frame);
  chevron(context, MENU_RECTS[item === "music" ? "musicUp" : "soundUp"], 1, value < VOLUME_STEPS, hot, frame);
  const bar = VOLUME_BAR(rect);
  const cell = bar.w / VOLUME_STEPS;
  for (let index = 0; index < VOLUME_STEPS; index += 1) {
    const on = index < value;
    const grow = Math.round((index / VOLUME_STEPS) * 10);
    context.fillStyle = SHADE;
    context.fillRect(bar.x + index * cell + 2, bar.y + 12 - grow - 2, cell - 4 + 2, bar.h - 12 + grow + 4);
    context.fillStyle = on ? (index >= 8 ? PRIMARY : GOLD) : "#2b2f3a";
    context.fillRect(bar.x + index * cell + 3, bar.y + 12 - grow, cell - 6, bar.h - 12 + grow);
  }
  if (value === 0) {
    const off = t("settings.off");
    text(context, off, bar.x + bar.w / 2, bar.y + bar.h / 2 - 8, 18, LOCK, "center");
  }
}

function drawSettings(context: CanvasRenderingContext2D, menu: Menu, frame: number): void {
  pagePanel(context, SETTINGS_PANEL, t("settings.title"), ICONS.gear);
  const language = settingRow(context, menu, "language", t("settings.language"), ICONS.globe, frame);
  const hot = menu.focus === "language";
  chevron(context, MENU_RECTS.languagePrev, -1, true, hot, frame);
  chevron(context, MENU_RECTS.languageNext, 1, true, hot, frame);
  const name = localeName(currentLocale());
  const left = MENU_RECTS.languagePrev.x + MENU_RECTS.languagePrev.w;
  const width = MENU_RECTS.languageNext.x - left;
  text(context, name, left + width / 2, language.y + language.h / 2 - 12, fitSize(context, name, width - 20, 24), TITLE_INK, "center");
  drawVolume(context, menu, "music", frame);
  drawVolume(context, menu, "sound", frame);
  const controls = settingRow(context, menu, "controls", t("settings.controls"), ICONS.pad, frame);
  icon(context, ICONS.arrow, controls.x + controls.w - 52, controls.y + controls.h / 2 - 14, 4, menu.focus === "controls" ? TITLE_INK : EDGE);
  const sample = [t("controls.keyboard"), t("controls.gamepad"), t("controls.touch")].join(" · ");
  text(context, sample, controls.x + 300, controls.y + controls.h / 2 - 8, fitSize(context, sample, controls.w - 370, 16), MUTED);
  menuButton(context, menu, "done", t("settings.done"), null, frame);
}

const CONTROL_ROWS: readonly (readonly [MessageKey, MessageKey, MessageKey, MessageKey | null])[] = [
  ["controls.move", "tutorial.hint.move.keys", "tutorial.hint.move.pad", "tutorial.hint.move.touch"],
  ["controls.dash", "tutorial.hint.dash.keys", "tutorial.hint.dash.pad", "tutorial.hint.dash.touch"],
  ["controls.pick", "tutorial.hint.pick.keys", "tutorial.hint.pick.pad", "tutorial.hint.pick.touch"],
  ["controls.reroll", "controls.reroll.keys", "controls.reroll.pad", "controls.reroll.touch"],
  ["controls.pause", "controls.pause.keys", "controls.pause.pad", null],
  ["controls.music", "controls.music.keys", "controls.music.menu", "controls.music.menu"],
];

function drawControls(context: CanvasRenderingContext2D, menu: Menu, frame: number): void {
  const panelRect = CONTROLS_PANEL;
  pagePanel(context, panelRect, t("controls.title"), ICONS.pad);
  const labelWidth = 230;
  const column = (panelRect.w - 60 - labelWidth) / 3;
  const heads: readonly (readonly [MessageKey, Bitmap])[] = [
    ["controls.keyboard", ICONS.keys],
    ["controls.gamepad", ICONS.pad],
    ["controls.touch", ICONS.touch],
  ];
  heads.forEach(([key, glyph], index) => {
    const x = panelRect.x + 30 + labelWidth + index * column;
    icon(context, glyph, x + 8, panelRect.y + 100, 4, EDGE);
    text(context, t(key), x + 50, panelRect.y + 104, fitSize(context, t(key), column - 64, 22), GOLD);
  });
  const spaced = usesSpaces(currentLocale());
  CONTROL_ROWS.forEach(([label, keys, pad, touch], row) => {
    const y = panelRect.y + 150 + row * 64;
    context.fillStyle = row % 2 === 0 ? "rgba(43, 47, 58, 0.55)" : "rgba(43, 47, 58, 0.25)";
    context.fillRect(panelRect.x + 24, y - 6, panelRect.w - 48, 58);
    text(context, t(label), panelRect.x + 40, y + 10, fitSize(context, t(label), labelWidth - 30, 20), INK);
    [keys, pad, touch].forEach((key, index) => {
      const x = panelRect.x + 30 + labelWidth + index * column + 8;
      if (!key) {
        context.fillStyle = MUTED;
        context.fillRect(x, y + 20, 24, 4);
        return;
      }
      const lines = wrapLines(t(key), column - 24, spaced, (line) => measure(context, line, 15));
      lines.slice(0, 2).forEach((line, index) => text(context, line, x, y + (lines.length > 1 ? 2 : 12) + index * 22, 15, DIM));
    });
  });
  menuButton(context, menu, "back", t("menu.back"), null, frame);
}

const CREDIT_LINES: readonly MessageKey[] = ["credits.madeBy", "credits.inspired", "credits.music", "credits.tech", "credits.parody", "credits.license"];

function drawCredits(context: CanvasRenderingContext2D, menu: Menu, frame: number): void {
  const panelRect = CREDITS_PANEL;
  pagePanel(context, panelRect, t("credits.title"), ICONS.star);
  const spaced = usesSpaces(currentLocale());
  let y = panelRect.y + 110;
  CREDIT_LINES.forEach((key, index) => {
    const lines = wrapLines(t(key), panelRect.w - 120, spaced, (line) => measure(context, line, 20));
    lines.forEach((line) => {
      text(context, line, panelRect.x + panelRect.w / 2, y, 20, index === 0 ? TITLE_INK : DIM, "center");
      y += 30;
    });
    y += 22;
  });
  menuButton(context, menu, "mastra", t("credits.mastra"), ICONS.link, frame);
  menuButton(context, menu, "source", t("credits.source"), ICONS.link, frame);
  menuButton(context, menu, "back", t("menu.back"), null, frame);
}

export function drawMenu(context: CanvasRenderingContext2D, menu: Menu, frame: number, device: MenuDevice): void {
  drawShade(context);
  if (menu.page === "home") {
    drawHome(context, menu, frame);
  } else {
    context.globalAlpha = 0.35;
    drawLogo(context, frame);
    context.globalAlpha = 1;
  }
  if (menu.page === "settings") {
    drawSettings(context, menu, frame);
  } else if (menu.page === "controls") {
    drawControls(context, menu, frame);
  } else if (menu.page === "credits") {
    drawCredits(context, menu, frame);
  }
  drawHint(context, device, menu.page);
}
