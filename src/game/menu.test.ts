import { describe, expect, it } from "vitest";
import { WORLDS } from "../sim/arena/content";
import { HUD_HEIGHT, HUD_WIDTH } from "./hud";
import { DEFAULT_SETTINGS, Menu, menuRect, MENU_RECTS, PAGE_ROWS, parseCleared, parseSettings, unlockedWorlds, VOLUME_BAR, VOLUME_STEPS, type MenuPage } from "./menu";

const PAGES: readonly MenuPage[] = ["home", "settings", "controls", "credits"];

function center(page: MenuPage, item: Parameters<typeof menuRect>[1]): { readonly x: number; readonly y: number } {
  const rect = menuRect(page, item);
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

describe("main menu", () => {
  it("opens on Start, aimed at the furthest world you have unlocked", () => {
    expect(new Menu(DEFAULT_SETTINGS, 0).focus).toBe("start");
    expect(new Menu(DEFAULT_SETTINGS, 0).world).toBe(0);
    expect(new Menu(DEFAULT_SETTINGS, 2).world).toBe(2);
    expect(new Menu(DEFAULT_SETTINGS, WORLDS.length).world).toBe(WORLDS.length - 1);
  });

  it("starts the picked world, and refuses a locked one", () => {
    const menu = new Menu(DEFAULT_SETTINGS, 1);
    expect(menu.activate()).toEqual({ kind: "start", world: 1 });
    menu.move(1, 0);
    expect(menu.world).toBe(2);
    expect(menu.locked()).toBe(true);
    expect(menu.activate()).toEqual({ kind: "locked", world: 2 });
    menu.move(-1, 0);
    menu.move(-1, 0);
    expect(menu.activate()).toEqual({ kind: "start", world: 0 });
  });

  it("stops at the first and last world", () => {
    const menu = new Menu(DEFAULT_SETTINGS, 0);
    expect(menu.move(-1, 0)).toBeNull();
    expect(menu.world).toBe(0);
    for (let step = 0; step < WORLDS.length + 3; step += 1) {
      menu.move(1, 0);
    }
    expect(menu.world).toBe(WORLDS.length - 1);
  });

  it("unlocks the next world when a boss falls", () => {
    const menu = new Menu(DEFAULT_SETTINGS, 0);
    menu.setCleared(1);
    expect(menu.unlocked).toBe(2);
    expect(menu.world).toBe(1);
    menu.setCleared(0);
    expect(menu.unlocked).toBe(2);
    expect(unlockedWorlds(99)).toBe(WORLDS.length);
  });

  it("walks every page with up and down, wrapping around", () => {
    for (const page of PAGES) {
      const menu = new Menu(DEFAULT_SETTINGS, 0);
      menu.open(page);
      const seen = new Set<string>();
      for (let step = 0; step < 12; step += 1) {
        seen.add(menu.focus);
        menu.move(0, 1);
      }
      expect([...seen].sort()).toEqual(PAGE_ROWS[page].map((row) => row[0]).sort());
    }
  });

  it("goes back up the page tree and lands on the button you came from", () => {
    const menu = new Menu(DEFAULT_SETTINGS, 0);
    menu.open("settings");
    menu.open("controls");
    menu.back();
    expect(menu.page).toBe("settings");
    expect(menu.focus).toBe("controls");
    menu.back();
    expect(menu.page).toBe("home");
    expect(menu.focus).toBe("settings");
    expect(menu.back()).toBeNull();
  });

  it("changes language and volumes from the settings rows", () => {
    const menu = new Menu(DEFAULT_SETTINGS, 0);
    menu.open("settings");
    expect(menu.move(1, 0)).toEqual({ kind: "locale", step: 1 });
    expect(menu.move(-1, 0)).toEqual({ kind: "locale", step: -1 });
    menu.move(0, 1);
    for (let step = 0; step < 20; step += 1) {
      menu.move(1, 0);
    }
    expect(menu.settings.music).toBe(VOLUME_STEPS);
    menu.move(0, 1);
    for (let step = 0; step < 20; step += 1) {
      menu.move(-1, 0);
    }
    expect(menu.settings.sound).toBe(0);
    expect(menu.activate()).toEqual({ kind: "settings", settings: { music: VOLUME_STEPS, sound: DEFAULT_SETTINGS.sound } });
  });

  it("sets a volume by clicking the bar", () => {
    const menu = new Menu(DEFAULT_SETTINGS, 0);
    menu.open("settings");
    const bar = VOLUME_BAR(MENU_RECTS.music);
    menu.click(bar.x + bar.w * 0.25, bar.y + bar.h / 2);
    expect(menu.settings.music).toBe(3);
    menu.click(bar.x + bar.w - 1, bar.y + bar.h / 2);
    expect(menu.settings.music).toBe(VOLUME_STEPS);
  });

  it("answers clicks and taps on every button", () => {
    const menu = new Menu(DEFAULT_SETTINGS, 4);
    const next = center("home", "worldPrev");
    expect(menu.click(next.x, next.y)).toEqual({ kind: "world", world: 3 });
    const start = center("home", "start");
    expect(menu.click(start.x, start.y)).toEqual({ kind: "start", world: 3 });
    const help = center("home", "howTo");
    expect(menu.click(help.x, help.y)).toEqual({ kind: "tutorial" });
    const credits = center("home", "credits");
    expect(menu.click(credits.x, credits.y)).toEqual({ kind: "page", page: "credits" });
    const link = center("credits", "mastra");
    expect(menu.click(link.x, link.y)).toEqual({ kind: "open", link: "mastra" });
    const back = center("credits", "back");
    expect(menu.click(back.x, back.y)).toEqual({ kind: "page", page: "home" });
    expect(menu.click(5, 5)).toBeNull();
  });

  it("keeps every button on screen, with no two focusable buttons overlapping", () => {
    for (const page of PAGES) {
      const items = PAGE_ROWS[page].flat();
      const rects = items.map((item) => menuRect(page, item));
      for (const rect of rects) {
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.w).toBeLessThanOrEqual(HUD_WIDTH);
        expect(rect.y + rect.h).toBeLessThanOrEqual(HUD_HEIGHT);
      }
      rects.forEach((a, index) =>
        rects.slice(index + 1).forEach((b) => {
          const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          expect(overlap).toBe(false);
        }),
      );
    }
  });
});

describe("saved menu data", () => {
  it("falls back to defaults for missing or broken settings", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("{oops")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"music": 99, "sound": -4}')).toEqual({ music: VOLUME_STEPS, sound: 0 });
    expect(parseSettings('{"music": "loud"}')).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps the cleared-boss count in range", () => {
    expect(parseCleared(null)).toBe(0);
    expect(parseCleared("3")).toBe(3);
    expect(parseCleared("77")).toBe(WORLDS.length);
    expect(parseCleared("-1")).toBe(0);
    expect(parseCleared("1.5")).toBe(0);
  });
});
