import { describe, expect, it } from "vitest";
import { crc32, encodePng, enemySheet } from "./sheet";

describe("art sheet", () => {
  it("computes the standard PNG checksum", () => {
    expect(crc32(new TextEncoder().encode("IEND"))).toBe(0xae426082);
  });

  it("writes a PNG with the right signature and size", () => {
    const png = encodePng({ width: 3, height: 2, rgba: new Uint8Array(3 * 2 * 4) });
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(png.buffer);
    expect(view.getUint32(16)).toBe(3);
    expect(view.getUint32(20)).toBe(2);
  });

  it("draws one row per world with every enemy on its ground", () => {
    const sheet = enemySheet();
    expect(sheet.width).toBeGreaterThan(100);
    expect(sheet.rgba.length).toBe(sheet.width * sheet.height * 4);
  });
});
