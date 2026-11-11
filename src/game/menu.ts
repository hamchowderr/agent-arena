import { CONTEXT_ORDER, DEFAULT_LOADOUT, TEMPERATURE_ORDER, WORLDS, type ArenaLoadout, type ContextWindow, type Temperature } from "../sim/arena/content";
import type { Rect } from "./hud";
import { view } from "./layout";

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

export interface MenuLayout {
  readonly tall: boolean;
  readonly worldCard: Rect;
  readonly settingsPanel: Rect;
  readonly controlsPanel: Rect;
  readonly creditsPanel: Rect;
  readonly rects: Readonly<Record<MenuItem, Rect>>;
  readonly linkRow: Rect;
  readonly volumeBar: (row: Rect) => Rect;
}

const STEPPER_SIZE = 64;

function wideLayout(): MenuLayout {
  const homeX = 72;
  const homeW = 380;
  const worldCard: Rect = { x: 930, y: 118, w: 430, h: 540 };
  const settingsPanel: Rect = { x: 380, y: 120, w: 680, h: 580 };
  const controlsPanel: Rect = { x: 110, y: 96, w: 1220, h: 560 };
  const creditsPanel: Rect = { x: 260, y: 96, w: 920, h: 500 };
  const row = (index: number): Rect => ({ x: settingsPanel.x + 30, y: settingsPanel.y + 110 + index * 84, w: settingsPanel.w - 60, h: 68 });
  const stepperLeft = settingsPanel.x + 300;
  const stepperRight = settingsPanel.x + settingsPanel.w - 30 - STEPPER_SIZE;
  const stepper = (at: Rect, side: "left" | "right"): Rect => ({ x: side === "left" ? stepperLeft : stepperRight, y: at.y + 6, w: STEPPER_SIZE, h: at.h - 12 });
  return {
    tall: false,
    worldCard,
    settingsPanel,
    controlsPanel,
    creditsPanel,
    rects: {
      start: { x: homeX, y: 300, w: homeW, h: 92 },
      loadout: { x: homeX, y: 406, w: homeW, h: 60 },
      settings: { x: homeX, y: 478, w: homeW, h: 60 },
      howTo: { x: homeX, y: 550, w: homeW, h: 60 },
      credits: { x: homeX, y: 622, w: homeW, h: 60 },
      ...settingRects(row, stepper),
      mastra: { x: homeX, y: 690, w: homeW + 120, h: 50 },
      worldPrev: { x: worldCard.x - 58, y: worldCard.y + 160, w: 50, h: 96 },
      worldNext: { x: worldCard.x + worldCard.w + 8, y: worldCard.y + 160, w: 50, h: 96 },
      worldCard,
      done: { x: settingsPanel.x + settingsPanel.w / 2 - 150, y: settingsPanel.y + settingsPanel.h - 96, w: 300, h: 64 },
      back: { x: 1440 / 2 - 160, y: 690, w: 320, h: 64 },
      source: { x: creditsPanel.x + creditsPanel.w / 2 + 12, y: 612, w: 420, h: 60 },
    },
    linkRow: { x: creditsPanel.x + creditsPanel.w / 2 - 432, y: 612, w: 420, h: 60 },
    volumeBar: (at) => ({ x: stepperLeft + 78, y: at.y + 18, w: stepperRight - stepperLeft - 92, h: at.h - 36 }),
  };
}

function tallLayout(): MenuLayout {
  const homeX = 40;
  const homeW = 460;
  const half = (homeW - 12) / 2;
  const worldCard: Rect = { x: 70, y: 196, w: 400, h: 520 };
  const settingsPanel: Rect = { x: 20, y: 150, w: 500, h: 690 };
  const controlsPanel: Rect = { x: 20, y: 90, w: 500, h: 870 };
  const creditsPanel: Rect = { x: 20, y: 90, w: 500, h: 760 };
  const row = (index: number): Rect => ({ x: settingsPanel.x + 24, y: settingsPanel.y + 100 + index * 116, w: settingsPanel.w - 48, h: 104 });
  const stepper = (at: Rect, side: "left" | "right"): Rect => ({
    x: side === "left" ? at.x + 12 : at.x + at.w - 12 - STEPPER_SIZE,
    y: at.y + 46,
    w: STEPPER_SIZE,
    h: 50,
  });
  return {
    tall: true,
    worldCard,
    settingsPanel,
    controlsPanel,
    creditsPanel,
    rects: {
      start: { x: homeX, y: 736, w: homeW, h: 88 },
      loadout: { x: homeX, y: 842, w: half, h: 58 },
      settings: { x: homeX + half + 12, y: 842, w: half, h: 58 },
      howTo: { x: homeX, y: 912, w: half, h: 58 },
      credits: { x: homeX + half + 12, y: 912, w: half, h: 58 },
      ...settingRects(row, stepper),
      mastra: { x: homeX, y: 990, w: homeW, h: 50 },
      worldPrev: { x: worldCard.x - 58, y: worldCard.y + 160, w: 50, h: 96 },
      worldNext: { x: worldCard.x + worldCard.w + 8, y: worldCard.y + 160, w: 50, h: 96 },
      worldCard,
      done: { x: settingsPanel.x + settingsPanel.w / 2 - 150, y: settingsPanel.y + settingsPanel.h - 96, w: 300, h: 64 },
      back: { x: 540 / 2 - 160, y: 984, w: 320, h: 64 },
      source: { x: homeX, y: 928, w: homeW, h: 52 },
    },
    linkRow: { x: homeX, y: 866, w: homeW, h: 52 },
    volumeBar: (at) => {
      const left = stepper(at, "left");
      const right = stepper(at, "right");
      return { x: left.x + 78, y: at.y + 50, w: right.x - left.x - 92, h: 40 };
    },
  };
}

type SettingItem =
  | "context"
  | "temperature"
  | "contextPrev"
  | "contextNext"
  | "temperaturePrev"
  | "temperatureNext"
  | "language"
  | "music"
  | "sound"
  | "controls"
  | "languagePrev"
  | "languageNext"
  | "musicDown"
  | "musicUp"
  | "soundDown"
  | "soundUp";

function settingRects(row: (index: number) => Rect, stepper: (at: Rect, side: "left" | "right") => Rect): Record<SettingItem, Rect> {
  return {
    context: row(0),
    temperature: row(1),
    contextPrev: stepper(row(0), "left"),
    contextNext: stepper(row(0), "right"),
    temperaturePrev: stepper(row(1), "left"),
    temperatureNext: stepper(row(1), "right"),
    language: row(0),
    music: row(1),
    sound: row(2),
    controls: row(3),
    languagePrev: stepper(row(0), "left"),
    languageNext: stepper(row(0), "right"),
    musicDown: stepper(row(1), "left"),
    musicUp: stepper(row(1), "right"),
    soundDown: stepper(row(2), "left"),
    soundUp: stepper(row(2), "right"),
  };
}

export const WIDE_MENU = wideLayout();
export const TALL_MENU = tallLayout();

export function menuLayout(): MenuLayout {
  return view().stage.portrait ? TALL_MENU : WIDE_MENU;
}

export function menuRect(page: MenuPage, item: MenuItem, layout: MenuLayout = menuLayout()): Rect {
  return page === "credits" && item === "mastra" ? layout.linkRow : layout.rects[item];
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
      const bar = menuLayout().volumeBar(menuLayout().rects[item]);
      if (inRect(bar, x, y)) {
        return this.setVolume(item, Math.ceil(((x - bar.x) / bar.w) * VOLUME_STEPS));
      }
    }
    return this.activate(item);
  }
}
