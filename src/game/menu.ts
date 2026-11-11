import { CONTEXT_ORDER, DEFAULT_LOADOUT, TEMPERATURE_ORDER, WORLDS, type ArenaLoadout, type ContextWindow, type Temperature } from "../sim/arena/content";
import type { Rect } from "./hud";

export type MenuPage = "home" | "loadout" | "settings" | "controls" | "credits";

export type MenuItem =
  | "start"
  | "loadout"
  | "context"
  | "temperature"
  | "contextPrev"
  | "contextNext"
  | "temperaturePrev"
  | "temperatureNext"
  | "settings"
  | "howTo"
  | "credits"
  | "mastra"
  | "worldPrev"
  | "worldNext"
  | "worldCard"
  | "language"
  | "music"
  | "sound"
  | "controls"
  | "done"
  | "source"
  | "back"
  | "languagePrev"
  | "languageNext"
  | "musicDown"
  | "musicUp"
  | "soundDown"
  | "soundUp";

export type Volume = "music" | "sound";

export interface MenuSettings {
  readonly music: number;
  readonly sound: number;
}

export const VOLUME_STEPS = 10;
export const DEFAULT_SETTINGS: MenuSettings = { music: 6, sound: 8 };

export type MenuLink = "mastra" | "source";

export const MENU_LINKS: Readonly<Record<MenuLink, string>> = {
  mastra: "https://mastra.ai",
  source: "https://github.com/hamchowderr/agent-arena",
};

export type MenuCommand =
  | { readonly kind: "start"; readonly world: number }
  | { readonly kind: "tutorial" }
  | { readonly kind: "locked"; readonly world: number }
  | { readonly kind: "world"; readonly world: number }
  | { readonly kind: "locale"; readonly step: 1 | -1 }
  | { readonly kind: "settings"; readonly settings: MenuSettings }
  | { readonly kind: "loadout"; readonly loadout: ArenaLoadout }
  | { readonly kind: "open"; readonly link: MenuLink }
  | { readonly kind: "page"; readonly page: MenuPage };

const HOME_X = 72;
const HOME_W = 380;

export const WORLD_CARD: Rect = { x: 930, y: 118, w: 430, h: 540 };
export const SETTINGS_PANEL: Rect = { x: 380, y: 120, w: 680, h: 580 };
export const CONTROLS_PANEL: Rect = { x: 110, y: 96, w: 1220, h: 560 };
export const CREDITS_PANEL: Rect = { x: 260, y: 96, w: 920, h: 500 };

const SETTING_ROW = (index: number): Rect => ({ x: SETTINGS_PANEL.x + 30, y: SETTINGS_PANEL.y + 110 + index * 84, w: SETTINGS_PANEL.w - 60, h: 68 });
const STEPPER_LEFT = SETTINGS_PANEL.x + 300;
const STEPPER_RIGHT = SETTINGS_PANEL.x + SETTINGS_PANEL.w - 30 - 64;

function stepper(row: Rect, side: "left" | "right"): Rect {
  return { x: side === "left" ? STEPPER_LEFT : STEPPER_RIGHT, y: row.y + 6, w: 64, h: row.h - 12 };
}

export const VOLUME_BAR = (row: Rect): Rect => ({ x: STEPPER_LEFT + 78, y: row.y + 18, w: STEPPER_RIGHT - STEPPER_LEFT - 92, h: row.h - 36 });

export const MENU_RECTS: Readonly<Record<MenuItem, Rect>> = {
  start: { x: HOME_X, y: 300, w: HOME_W, h: 92 },
  loadout: { x: HOME_X, y: 406, w: HOME_W, h: 60 },
  settings: { x: HOME_X, y: 478, w: HOME_W, h: 60 },
  howTo: { x: HOME_X, y: 550, w: HOME_W, h: 60 },
  credits: { x: HOME_X, y: 622, w: HOME_W, h: 60 },
  context: SETTING_ROW(0),
  temperature: SETTING_ROW(1),
  contextPrev: stepper(SETTING_ROW(0), "left"),
  contextNext: stepper(SETTING_ROW(0), "right"),
  temperaturePrev: stepper(SETTING_ROW(1), "left"),
  temperatureNext: stepper(SETTING_ROW(1), "right"),
  mastra: { x: HOME_X, y: 690, w: HOME_W + 120, h: 50 },
  worldPrev: { x: WORLD_CARD.x - 58, y: WORLD_CARD.y + 160, w: 50, h: 96 },
  worldNext: { x: WORLD_CARD.x + WORLD_CARD.w + 8, y: WORLD_CARD.y + 160, w: 50, h: 96 },
  worldCard: WORLD_CARD,
  language: SETTING_ROW(0),
  music: SETTING_ROW(1),
  sound: SETTING_ROW(2),
  controls: SETTING_ROW(3),
  done: { x: SETTINGS_PANEL.x + SETTINGS_PANEL.w / 2 - 150, y: SETTINGS_PANEL.y + SETTINGS_PANEL.h - 96, w: 300, h: 64 },
  languagePrev: stepper(SETTING_ROW(0), "left"),
  languageNext: stepper(SETTING_ROW(0), "right"),
  musicDown: stepper(SETTING_ROW(1), "left"),
  musicUp: stepper(SETTING_ROW(1), "right"),
  soundDown: stepper(SETTING_ROW(2), "left"),
  soundUp: stepper(SETTING_ROW(2), "right"),
  back: { x: 1440 / 2 - 160, y: 690, w: 320, h: 64 },
  source: { x: CREDITS_PANEL.x + CREDITS_PANEL.w / 2 + 12, y: 612, w: 420, h: 60 },
};

const LINK_ROW: Rect = { x: CREDITS_PANEL.x + CREDITS_PANEL.w / 2 - 432, y: 612, w: 420, h: 60 };

export function menuRect(page: MenuPage, item: MenuItem): Rect {
  return page === "credits" && item === "mastra" ? LINK_ROW : MENU_RECTS[item];
}

export const PAGE_ROWS: Readonly<Record<MenuPage, readonly (readonly MenuItem[])[]>> = {
  home: [["start"], ["loadout"], ["settings"], ["howTo"], ["credits"], ["mastra"]],
  loadout: [["context"], ["temperature"], ["done"]],
  settings: [["language"], ["music"], ["sound"], ["controls"], ["done"]],
  controls: [["back"]],
  credits: [["mastra", "source"], ["back"]],
};

const PAGE_CLICKS: Readonly<Record<MenuPage, readonly MenuItem[]>> = {
  home: ["start", "loadout", "settings", "howTo", "credits", "mastra", "worldPrev", "worldNext", "worldCard"],
  loadout: ["contextPrev", "contextNext", "temperaturePrev", "temperatureNext", "context", "temperature", "done"],
  settings: ["languagePrev", "languageNext", "musicDown", "musicUp", "soundDown", "soundUp", "language", "music", "sound", "controls", "done"],
  controls: ["back"],
  credits: ["mastra", "source", "back"],
};

const PARENT: Readonly<Record<MenuPage, MenuPage | null>> = { home: null, loadout: "home", settings: "home", controls: "settings", credits: "home" };

const HOME_FOCUS: Readonly<Partial<Record<MenuPage, MenuItem>>> = { loadout: "loadout", settings: "settings", credits: "credits", controls: "controls" };

function stepOf<T>(order: readonly T[], current: T, step: 1 | -1): T {
  return order[(order.indexOf(current) + step + order.length) % order.length] ?? current;
}

export function parseLoadout(raw: string | null): ArenaLoadout {
  try {
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved === "object") {
      const fields = saved as Record<string, unknown>;
      const context = CONTEXT_ORDER.find((entry) => entry === fields["context"]) ?? DEFAULT_LOADOUT.context;
      const temperature = TEMPERATURE_ORDER.find((entry) => entry === fields["temperature"]) ?? DEFAULT_LOADOUT.temperature;
      return { context, temperature };
    }
  } catch {
    return DEFAULT_LOADOUT;
  }
  return DEFAULT_LOADOUT;
}

export function clampVolume(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(VOLUME_STEPS, Math.round(value))) : 0;
}

export function parseSettings(raw: string | null): MenuSettings {
  try {
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved === "object") {
      const fields = saved as Record<string, unknown>;
      const read = (key: Volume) => (typeof fields[key] === "number" ? clampVolume(fields[key]) : DEFAULT_SETTINGS[key]);
      return { music: read("music"), sound: read("sound") };
    }
  } catch {
    return DEFAULT_SETTINGS;
  }
  return DEFAULT_SETTINGS;
}

export function parseCleared(raw: string | null): number {
  const value = Number(raw);
  return Number.isInteger(value) ? Math.max(0, Math.min(WORLDS.length, value)) : 0;
}

export function unlockedWorlds(cleared: number): number {
  return Math.max(1, Math.min(WORLDS.length, cleared + 1));
}

export function inRect(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export interface WorldSwap {
  readonly from: number;
  readonly direction: 1 | -1;
  age: number;
}

export class Menu {
  page: MenuPage = "home";
  world: number;
  swap: WorldSwap | null = null;
  shake = 0;
  pressed: { readonly item: MenuItem; age: number } | null = null;
  private row = 0;
  private column = 0;

  constructor(
    public settings: MenuSettings,
    private cleared: number,
    public loadout: ArenaLoadout = DEFAULT_LOADOUT,
  ) {
    this.world = this.unlocked - 1;
  }

  get unlocked(): number {
    return unlockedWorlds(this.cleared);
  }

  get bossesCleared(): number {
    return this.cleared;
  }

  get focus(): MenuItem {
    const rows = PAGE_ROWS[this.page];
    const row = rows[Math.min(this.row, rows.length - 1)] ?? [];
    return row[Math.min(this.column, row.length - 1)] ?? "start";
  }

  locked(world = this.world): boolean {
    return world >= this.unlocked;
  }

  setCleared(cleared: number): void {
    const before = this.unlocked;
    this.cleared = Math.max(this.cleared, cleared);
    if (this.unlocked > before) {
      this.world = this.unlocked - 1;
    }
  }

  tick(): void {
    if (this.swap) {
      this.swap.age += 1;
      if (this.swap.age > 14) {
        this.swap = null;
      }
    }
    if (this.pressed) {
      this.pressed.age += 1;
      if (this.pressed.age > 8) {
        this.pressed = null;
      }
    }
    this.shake = Math.max(0, this.shake - 1);
  }

  open(page: MenuPage): MenuCommand {
    const from = this.page;
    this.page = page;
    this.column = 0;
    if (page === "home") {
      this.focusOn(HOME_FOCUS[from] ?? "start");
    } else if (page === "settings" && from === "controls") {
      this.focusOn("controls");
    } else {
      this.row = 0;
    }
    return { kind: "page", page };
  }

  private focusOn(item: MenuItem): void {
    const rows = PAGE_ROWS[this.page];
    rows.forEach((row, index) => {
      const column = row.indexOf(item);
      if (column >= 0) {
        this.row = index;
        this.column = column;
      }
    });
  }

  back(): MenuCommand | null {
    const parent = PARENT[this.page];
    return parent ? this.open(parent) : null;
  }

  pickWorld(step: 1 | -1): MenuCommand | null {
    const next = this.world + step;
    if (next < 0 || next >= WORLDS.length) {
      this.shake = 8;
      return null;
    }
    this.swap = { from: this.world, direction: step, age: 0 };
    this.world = next;
    return { kind: "world", world: next };
  }

  private changeVolume(volume: Volume, step: 1 | -1): MenuCommand {
    this.settings = { ...this.settings, [volume]: clampVolume(this.settings[volume] + step) };
    return { kind: "settings", settings: this.settings };
  }

  setVolume(volume: Volume, value: number): MenuCommand {
    this.settings = { ...this.settings, [volume]: clampVolume(value) };
    return { kind: "settings", settings: this.settings };
  }

  stepContext(step: 1 | -1): MenuCommand {
    const context: ContextWindow = stepOf(CONTEXT_ORDER, this.loadout.context, step);
    this.loadout = { ...this.loadout, context };
    return { kind: "loadout", loadout: this.loadout };
  }

  stepTemperature(step: 1 | -1): MenuCommand {
    const temperature: Temperature = stepOf(TEMPERATURE_ORDER, this.loadout.temperature, step);
    this.loadout = { ...this.loadout, temperature };
    return { kind: "loadout", loadout: this.loadout };
  }

  move(dx: number, dy: number): MenuCommand | null {
    if (dy !== 0) {
      const rows = PAGE_ROWS[this.page];
      this.row = (this.row + Math.sign(dy) + rows.length) % rows.length;
      this.column = Math.min(this.column, (rows[this.row]?.length ?? 1) - 1);
      return null;
    }
    if (dx === 0) {
      return null;
    }
    const step = dx > 0 ? 1 : -1;
    const focus = this.focus;
    if (this.page === "home") {
      return this.pickWorld(step);
    }
    if (focus === "language") {
      return { kind: "locale", step };
    }
    if (focus === "context") {
      return this.stepContext(step);
    }
    if (focus === "temperature") {
      return this.stepTemperature(step);
    }
    if (focus === "music" || focus === "sound") {
      return this.changeVolume(focus, step);
    }
    const row = PAGE_ROWS[this.page][this.row] ?? [];
    this.column = (this.column + step + row.length) % row.length;
    return null;
  }

  activate(item: MenuItem = this.focus): MenuCommand | null {
    this.pressed = { item, age: 0 };
    switch (item) {
      case "start":
      case "worldCard":
        if (this.locked()) {
          this.shake = 12;
          return { kind: "locked", world: this.world };
        }
        return { kind: "start", world: this.world };
      case "howTo":
        return { kind: "tutorial" };
      case "loadout":
      case "settings":
      case "controls":
      case "credits":
        return this.open(item);
      case "context":
      case "contextNext":
        return this.stepContext(1);
      case "contextPrev":
        return this.stepContext(-1);
      case "temperature":
      case "temperatureNext":
        return this.stepTemperature(1);
      case "temperaturePrev":
        return this.stepTemperature(-1);
      case "done":
      case "back":
        return this.back();
      case "mastra":
      case "source":
        return { kind: "open", link: item };
      case "worldPrev":
        return this.pickWorld(-1);
      case "worldNext":
        return this.pickWorld(1);
      case "language":
      case "languageNext":
        return { kind: "locale", step: 1 };
      case "languagePrev":
        return { kind: "locale", step: -1 };
      case "music":
      case "sound":
        return this.setVolume(item, this.settings[item] > 0 ? 0 : DEFAULT_SETTINGS[item]);
      case "musicDown":
        return this.changeVolume("music", -1);
      case "musicUp":
        return this.changeVolume("music", 1);
      case "soundDown":
        return this.changeVolume("sound", -1);
      case "soundUp":
        return this.changeVolume("sound", 1);
    }
  }

  itemAt(x: number, y: number): MenuItem | null {
    return PAGE_CLICKS[this.page].find((item) => inRect(menuRect(this.page, item), x, y)) ?? null;
  }

  hover(x: number, y: number): void {
    const item = this.itemAt(x, y);
    if (item && PAGE_ROWS[this.page].some((row) => row.includes(item))) {
      this.focusOn(item);
    }
  }

  click(x: number, y: number): MenuCommand | null {
    const item = this.itemAt(x, y);
    if (!item) {
      return null;
    }
    this.hover(x, y);
    if (this.page === "settings" && (item === "music" || item === "sound")) {
      const bar = VOLUME_BAR(MENU_RECTS[item]);
      if (inRect(bar, x, y)) {
        return this.setVolume(item, Math.ceil(((x - bar.x) / bar.w) * VOLUME_STEPS));
      }
    }
    return this.activate(item);
  }
}
