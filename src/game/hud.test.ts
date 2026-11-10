import { describe, expect, it } from "vitest";
import { bossMarker, HUD_HEIGHT, HUD_WIDTH, wrapLines } from "./hud";

describe("bossMarker", () => {
  it("floats over the boss when it is on screen", () => {
    const marker = bossMarker({ x: 700, y: 500 });
    expect(marker.onScreen).toBe(true);
    expect(marker.x).toBe(700);
    expect(marker.y).toBeLessThan(500);
  });

  it("stays over a boss near the top of the screen instead of jumping to the edge", () => {
    const marker = bossMarker({ x: 400, y: 200 });
    expect(marker.onScreen).toBe(true);
    expect(marker.x).toBe(400);
  });

  it.each([
    [{ x: -400, y: -200 }],
    [{ x: HUD_WIDTH + 900, y: -300 }],
    [{ x: HUD_WIDTH / 2 + 300, y: HUD_HEIGHT + 2000 }],
  ])("pins to the screen edge and points at an off-screen boss %o", (at) => {
    const marker = bossMarker(at);
    expect(marker.onScreen).toBe(false);
    expect(marker.x).toBeGreaterThanOrEqual(0);
    expect(marker.x).toBeLessThanOrEqual(HUD_WIDTH);
    expect(marker.y).toBeGreaterThanOrEqual(0);
    expect(marker.y).toBeLessThanOrEqual(HUD_HEIGHT);
    const towardX = Math.sign(at.x - HUD_WIDTH / 2);
    const towardY = Math.sign(at.y - HUD_HEIGHT / 2);
    expect(Math.sign(Math.round(Math.cos(marker.angle) * 100))).toBe(towardX);
    expect(Math.sign(Math.round(Math.sin(marker.angle) * 100))).toBe(towardY);
  });
});

describe("wrapLines", () => {
  const byLength = (line: string) => [...line].length * 10;

  it("wraps spaced languages at word breaks", () => {
    expect(wrapLines("one two three four", 90, true, byLength)).toEqual(["one two", "three", "four"]);
  });

  it("wraps Japanese and Chinese between characters, with no spaces to break on", () => {
    const lines = wrapLines("一番近いライバルにプロンプトを撃つ。", 60, false, byLength);
    expect(lines.every((line) => byLength(line) <= 60)).toBe(true);
    expect(lines.join("")).toBe("一番近いライバルにプロンプトを撃つ。");
  });
});
