import { TRANSPARENT } from "./palette";
import type { Raster } from "./raster";
import type { Sprite } from "./sprites";

const RAMP_COLORS = {
  paper: ["#ffffff", "#f4efe6", "#ddd3c8", "#a99cb2", "#3d3450"],
  stamp: ["#ffa8c4", "#f25c8a", "#c8306a", "#84205a", "#3e1030"],
  orange: ["#fff0a0", "#ffc35a", "#f78a2a", "#c24e2c", "#4a1c1a"],
  blue: ["#e0f6ff", "#9ad4fa", "#68a8ee", "#4170c4", "#182458"],
  yellow: ["#fffbd0", "#ffe56a", "#f4c030", "#c47a2a", "#4a2a14"],
  green: ["#c8f590", "#78d85a", "#3aa050", "#23685a", "#102a2c"],
  purple: ["#f4d8ff", "#d8a8ff", "#b47ae8", "#7a48c0", "#2e1858"],
  charcoal: ["#8a88a0", "#5c5c72", "#3c3c4e", "#26263a", "#0e0e1a"],
  skin: ["#ffe8d0", "#f8c8a0", "#e09a78", "#a86458", "#3e2028"],
  teal: ["#c8fff0", "#6ae8d0", "#2fb8a8", "#1f7a80", "#0c2a34"],
  red: ["#ffb0a0", "#ff6a5a", "#d83a3a", "#902a3a", "#3a1018"],
  steel: ["#ffffff", "#d0d8e8", "#9aa6bc", "#5c6680", "#20263a"],
  wood: ["#f0c890", "#c8905a", "#9a6040", "#6a3a34", "#2a1418"],
} as const;

export type RampName = keyof typeof RAMP_COLORS;

export interface Ramp {
  readonly hi: string;
  readonly light: string;
  readonly base: string;
  readonly shadow: string;
  readonly line: string;
}

const FIRST_KEY = 0x100;

const NAMES = Object.keys(RAMP_COLORS) as RampName[];

export const RAMPS: Readonly<Record<RampName, Ramp>> = Object.fromEntries(
  NAMES.map((name, index) => {
    const [hi, light, base, shadow, line] = [0, 1, 2, 3, 4].map((step) => String.fromCharCode(FIRST_KEY + index * 5 + step));
    return [name, { hi, light, base, shadow, line }];
  }),
) as Record<RampName, Ramp>;

export const FLAT_COLORS: Readonly<Record<string, string>> = Object.fromEntries(
  NAMES.flatMap((name, index) => RAMP_COLORS[name].map((color, step) => [String.fromCharCode(FIRST_KEY + index * 5 + step), color])),
);

function rampOfKey(key: string): Ramp | undefined {
  const code = key.charCodeAt(0) - FIRST_KEY;
  const name = code >= 0 ? NAMES[Math.floor(code / 5)] : undefined;
  return name ? RAMPS[name] : undefined;
}

function sameRamp(r: Raster, x: number, y: number, ramp: Ramp): boolean {
  return rampOfKey(r.get(x, y)) === ramp;
}

function reach(r: Raster, x: number, y: number, dx: number, dy: number, ramp: Ramp): number {
  let steps = 0;
  while (steps < 3 && sameRamp(r, x + dx * (steps + 1), y + dy * (steps + 1), ramp)) {
    steps += 1;
  }
  return steps;
}

export function light(r: Raster, ramp: Ramp): void {
  const tones: [number, number, string][] = [];
  for (let y = 0; y < r.height; y += 1) {
    for (let x = 0; x < r.width; x += 1) {
      if (r.get(x, y) !== ramp.base) {
        continue;
      }
      const up = reach(r, x, y, 0, -1, ramp);
      const left = reach(r, x, y, -1, 0, ramp);
      const down = reach(r, x, y, 0, 1, ramp);
      const right = reach(r, x, y, 1, 0, ramp);
      const tone = up === 0 && left <= 2 && down > 0 ? ramp.hi : up <= 1 || left === 0 ? ramp.light : down <= 1 || right === 0 ? ramp.shadow : ramp.base;
      tones.push([x, y, tone]);
    }
  }
  for (const [x, y, tone] of tones) {
    r.set(x, y, tone);
  }
}

export function lightAll(r: Raster, ...ramps: readonly Ramp[]): void {
  for (const ramp of ramps) {
    light(r, ramp);
  }
}

export function tinted(r: Raster): Sprite {
  const filled = (x: number, y: number) => r.get(x - 1, y - 1) !== TRANSPARENT && x >= 1 && y >= 1 && x <= r.width && y <= r.height;
  return Array.from({ length: r.height + 2 }, (_, y) =>
    Array.from({ length: r.width + 2 }, (_, x) => {
      if (filled(x, y)) {
        return r.get(x - 1, y - 1);
      }
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]] as const) {
        if (filled(x + dx, y + dy)) {
          return rampOfKey(r.get(x + dx - 1, y + dy - 1))?.line ?? "k";
        }
      }
      return TRANSPARENT;
    }).join(""),
  );
}

export type Mood = "eager" | "shocked" | "smug" | "angry" | "worried" | "fake" | "bright";

export function eye(r: Raster, at: number, y: number, mood: Mood): void {
  if (mood === "shocked" || mood === "bright") {
    r.rect(at, y - 1, 2, 3, "w").set(at + 1, y, "k");
  } else if (mood === "smug") {
    r.rect(at - 1, y, 3, 1, "k").set(at, y + 1, "w").set(at + 1, y + 1, "k");
  } else if (mood === "fake") {
    r.set(at - 1, y + 1, "k").set(at, y, "k").set(at + 1, y, "k").set(at + 2, y + 1, "k");
  } else {
    const tall = mood === "eager" ? 1 : 0;
    r.rect(at, y - tall, 2, 2 + tall, "k").set(at, y - tall, "w");
  }
  if (mood === "angry") {
    r.set(at - 1, y - 2, "k").set(at, y - 1, "k").set(at + 1, y - 1, "k");
  }
  if (mood === "worried") {
    r.set(at, y - 2, "k").set(at + 1, y - 2, "k").set(at - 1, y - 1, "k");
  }
}

export function eyes(r: Raster, x: number, y: number, gap: number, mood: Mood): void {
  eye(r, x, y, mood);
  eye(r, x + gap, y, mood);
}

export type Mouth = "grin" | "smirk" | "gritted" | "open" | "wobble";

export function mouth(r: Raster, x: number, y: number, width: number, shape: Mouth): void {
  switch (shape) {
    case "grin":
      r.rect(x, y, width, 1, "k").rect(x + 1, y + 1, width - 2, 1, "w").rect(x + 1, y + 2, width - 2, 1, "k").set(x, y + 1, "k").set(x + width - 1, y + 1, "k");
      for (let at = x + 2; at < x + width - 1; at += 2) {
        r.set(at, y + 1, "k");
      }
      break;
    case "smirk":
      r.rect(x, y + 1, width - 1, 1, "k").set(x + width - 1, y, "k");
      break;
    case "gritted":
      r.rect(x, y, width, 3, "k").rect(x + 1, y + 1, width - 2, 1, "w");
      for (let at = x + 2; at < x + width - 1; at += 2) {
        r.set(at, y + 1, "k");
      }
      break;
    case "open":
      r.rect(x, y, width, 2, "k").set(x + 1, y + 1, "r");
      break;
    case "wobble":
      for (let at = 0; at < width; at += 1) {
        r.set(x + at, y + (at % 2), "k");
      }
      break;
  }
}
