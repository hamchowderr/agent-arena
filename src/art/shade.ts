import { PALETTE, TRANSPARENT, type PaletteKey } from "./palette";
import type { Sprite } from "./sprites";

export const FACTION_KEY = "X";
export const FACTION_LIGHT_KEY = "H";
export const FACTION_DARK_KEY = "L";
export const OUTLINE_KEY = "k";

export interface Ramp {
  readonly light: string;
  readonly base: string;
  readonly dark: string;
  readonly line: string;
}

interface Hsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

function toHsl(hex: string): Hsl {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function toHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  const channel = (value: number) =>
    Math.round(Math.min(1, Math.max(0, value + m)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function shiftHue(h: number, toward: number, amount: number): number {
  const delta = ((toward - h + 540) % 360) - 180;
  return h + Math.sign(delta) * Math.min(Math.abs(delta), amount);
}

export function rampOf(base: string): Ramp {
  const color = toHsl(base);
  const clamp = (value: number) => Math.min(0.95, Math.max(0.04, value));
  return {
    light: toHex({ h: shiftHue(color.h, 55, 22), s: Math.min(1, color.s * 1.05), l: clamp(color.l + 0.16) }),
    base,
    dark: toHex({ h: shiftHue(color.h, 260, 24), s: color.s * 0.9, l: clamp(color.l - 0.15) }),
    line: toHex({ h: shiftHue(color.h, 260, 36), s: color.s * 0.75, l: clamp(color.l * 0.36) }),
  };
}

export type ColorGrid = readonly (readonly (string | null)[])[];

function merge(layers: readonly Sprite[]): string[][] {
  const width = Math.max(...layers.flatMap((layer) => layer.map((row) => row.length)));
  const height = Math.max(...layers.map((layer) => layer.length));
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => TRANSPARENT));
  for (const layer of layers) {
    layer.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        const key = row[x];
        const line = grid[y];
        if (key !== undefined && key !== TRANSPARENT && line) {
          line[x] = key;
        }
      }
    });
  }
  return grid;
}

const BODY = new Set([FACTION_KEY, FACTION_LIGHT_KEY, FACTION_DARK_KEY]);

export function shade(layers: readonly Sprite[], faction: string): ColorGrid {
  const grid = merge(layers);
  const ramp = rampOf(faction);
  const at = (x: number, y: number) => grid[y]?.[x] ?? TRANSPARENT;
  const outside = (x: number, y: number) => at(x, y) === TRANSPARENT;
  const body = (x: number, y: number) => BODY.has(at(x, y));
  return grid.map((row, y) =>
    row.map((key, x) => {
      if (key === TRANSPARENT) {
        return null;
      }
      if (key === FACTION_LIGHT_KEY) {
        return ramp.light;
      }
      if (key === FACTION_DARK_KEY) {
        return ramp.dark;
      }
      if (key === FACTION_KEY) {
        if (!body(x, y - 1) || (!body(x - 1, y) && body(x, y + 1) && !body(x - 1, y - 1))) {
          return ramp.light;
        }
        if (!body(x, y + 1) || !body(x + 1, y) || !body(x, y + 2)) {
          return ramp.dark;
        }
        return ramp.base;
      }
      const edge = outside(x - 1, y) || outside(x + 1, y) || outside(x, y - 1) || outside(x, y + 1);
      const touchesBody = body(x - 1, y) || body(x + 1, y) || body(x, y - 1) || body(x, y + 1);
      if (key === OUTLINE_KEY && edge && touchesBody) {
        return ramp.line;
      }
      return PALETTE[key as PaletteKey] ?? null;
    }),
  );
}
