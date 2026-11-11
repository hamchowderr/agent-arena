import { afterEach, describe, expect, it } from "vitest";
import html from "../../index.html?raw";
import { cardRects, fitTextBlock, guideStripRect, loadoutSlots, pauseQuitRect, postRect, rerollRect, shareRect, skipRect, speakerRect, watchRect, type Rect } from "./hud";
import { fitView, fromPopup, hudBacking, popupPlacement, renderSize, setView, TALL_STAGE, view, WIDE_STAGE } from "./layout";
import { lessonSpeakerRect, objectiveRect } from "./tutorial-hud";

const SCREENS: readonly (readonly [string, number, number])[] = [
  ["iPhone portrait", 390, 844],
  ["iPhone portrait in a browser", 390, 664],
  ["iPhone landscape", 844, 390],
  ["small Android portrait", 360, 740],
  ["iPad portrait", 810, 1080],
  ["iPad landscape", 1080, 810],
  ["square window", 900, 900],
  ["desktop 16:9", 1920, 1080],
  ["desktop 16:10", 1440, 900],
  ["ultrawide", 3440, 1440],
];

const original = view();

afterEach(() => setView(original));

function within(rect: Rect, width: number, height: number): void {
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.w).toBeLessThanOrEqual(width);
  expect(rect.y + rect.h).toBeLessThanOrEqual(height);
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

describe("fitView", () => {
  it.each(SCREENS)("fills the whole %s screen with no bars", (_, width, height) => {
    const fitted = fitView(width, height);
    expect(fitted.width / fitted.height).toBeCloseTo(width / height, 2);
    expect(fitted.width).toBeGreaterThanOrEqual(fitted.stage.width);
    expect(fitted.height).toBeGreaterThanOrEqual(fitted.stage.height);
    expect(Math.min(fitted.width - fitted.stage.width, fitted.height - fitted.stage.height)).toBeLessThanOrEqual(1);
    expect(fitted.stageX).toBeGreaterThanOrEqual(0);
    expect(fitted.stageY).toBeGreaterThanOrEqual(0);
  });

  it("lays out phones held upright on the tall stage and everything else on the wide one", () => {
    expect(fitView(390, 844).stage).toBe(TALL_STAGE);
    expect(fitView(844, 390).stage).toBe(WIDE_STAGE);
    expect(fitView(1920, 1080).stage).toBe(WIDE_STAGE);
  });

  it("keeps 16:9 desktops exactly as they were", () => {
    const fitted = fitView(1920, 1080);
    expect(fitted).toMatchObject({ width: 1440, height: 810, stageX: 0, stageY: 0 });
  });

  it("turns safe-area insets into HUD units", () => {
    const fitted = fitView(390, 844, { top: 47, right: 0, bottom: 34, left: 0 });
    expect(fitted.safe.top).toBe(Math.round(47 * fitted.unitsPerCss));
    expect(fitted.safe.bottom).toBe(Math.round(34 * fitted.unitsPerCss));
  });
});

describe("renderSize", () => {
  it.each(SCREENS)("matches the %s screen shape so pixels stay square", (_, width, height) => {
    const fitted = fitView(width, height);
    const size = renderSize(fitted);
    expect(Math.abs(size.width / size.height - width / height)).toBeLessThan(0.05 * (width / height) + 0.02);
    expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(200);
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(640);
  });

  it("keeps the 480x270 world view on a 16:9 screen", () => {
    expect(renderSize(fitView(1920, 1080))).toEqual({ width: 480, height: 270 });
  });
});

describe("hudBacking", () => {
  it("draws the HUD at the device's pixel density", () => {
    expect(hudBacking(390, 844, 3)).toEqual({ width: 1170, height: 2532 });
  });

  it("caps the canvas size on huge screens", () => {
    const backing = hudBacking(3840, 2160, 2);
    expect(backing.width * backing.height).toBeLessThanOrEqual(3_700_000);
  });
});

describe("fitTextBlock", () => {
  it("shrinks the guide's text until every line fits inside its box", () => {
    const linesAt = (size: number) => (size > 14 ? 4 : 3);
    const fit = fitTextBlock([18, 16, 14, 12], linesAt, 54);
    expect(fit.size).toBeLessThanOrEqual(14);
    expect((fit.lines - 1) * fit.gap + fit.size).toBeLessThanOrEqual(54);
  });

  it("cuts lines rather than spill when even the smallest size is too big", () => {
    const fit = fitTextBlock([12], () => 9, 54);
    expect((fit.lines - 1) * fit.gap + fit.size).toBeLessThanOrEqual(54);
  });
});

describe.each(SCREENS)("HUD layout on %s", (_, width, height) => {
  it("keeps the level-up cards, buttons and guide in the wide layout without overlap", () => {
    setView(fitView(width, height));
    const stage = WIDE_STAGE;
    const cards = cardRects(3);
    const buttons = [rerollRect(), skipRect()];
    const keyTabs = cards.map((card) => ({ x: card.x, y: card.y + card.h - 17, w: card.w, h: 33 }));
    const recommended = cards.map((card) => ({ x: card.x, y: card.y - 31, w: card.w, h: 32 }));
    for (const rect of [...cards, ...buttons, guideStripRect(), ...keyTabs, ...recommended]) {
      within(rect, stage.width, stage.height);
    }
    const blocks = [...cards, ...buttons, guideStripRect()];
    blocks.forEach((a, index) => blocks.slice(index + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)));
    keyTabs.forEach((tab, index) => {
      const next = recommended[index + 1];
      if (next) {
        expect(overlaps(tab, next)).toBe(false);
      }
      buttons.forEach((button) => expect(overlaps(tab, button)).toBe(false));
    });
  });

  it("shows the level-up, pause and results pop-ups on screen at their desktop layout", () => {
    setView(fitView(width, height));
    const screen = view();
    const popups = [...cardRects(3), rerollRect(), skipRect(), guideStripRect(), pauseQuitRect(), shareRect(), postRect(), watchRect()];
    for (const rect of popups) {
      within(rect, WIDE_STAGE.width, WIDE_STAGE.height);
      within(fromPopup(rect), screen.width, screen.height);
    }
  });

  it("keeps the speaker box, tutorial card and loadout on screen", () => {
    setView(fitView(width, height, { top: 40, right: 0, bottom: 30, left: 0 }));
    const screen = view();
    for (const rect of [speakerRect(), fromPopup(lessonSpeakerRect()), objectiveRect(), loadoutSlots(5, 6).bounds]) {
      within(rect, screen.width, screen.height);
    }
    expect(speakerRect().y + speakerRect().h).toBeLessThanOrEqual(screen.height - screen.safe.bottom);
    expect(objectiveRect().y).toBeGreaterThanOrEqual(screen.safe.top);
  });
});

describe("popupPlacement", () => {
  it("keeps three cards side by side on a phone held upright, scaled to fit", () => {
    setView(fitView(390, 844));
    const cards = cardRects(3).map((rect) => fromPopup(rect));
    expect(new Set(cards.map((card) => card.y)).size).toBe(1);
    expect(popupPlacement().scale).toBeLessThan(1);
  });

  it("leaves landscape screens at full size", () => {
    setView(fitView(1920, 1080));
    expect(popupPlacement()).toEqual({ x: 0, y: 0, scale: 1 });
  });
});

describe("the page shell", () => {
  it("gives the game the whole dynamic viewport instead of a fixed 16:9 box", () => {
    expect(html).not.toMatch(/aspect-ratio/);
    expect(html).toMatch(/height:\s*100dvh/);
    expect(html).toContain("viewport-fit=cover");
    expect(html).toContain("env(safe-area-inset-bottom)");
  });
});
