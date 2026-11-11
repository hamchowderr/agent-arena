import { mix } from "./animate";
import type { WeaponKind } from "../sim/arena/content";
import type { ColorGrid } from "./shade";

export const SPARK_FRAMES = 3;

export type SparkStyle = "hot" | "zap" | "ember" | "shard" | "chip" | "ring";

export const SPARK_STYLES: readonly SparkStyle[] = ["hot", "zap", "ember", "shard", "chip", "ring"];

export const SPARK_BY_WEAPON: Readonly<Record<WeaponKind, SparkStyle>> = {
  bolt: "hot",
  beam: "zap",
  homing: "zap",
  seeker: "shard",
  orbit: "shard",
  bomb: "ember",
  brick: "chip",
  pulse: "ring",
  laser: "hot",
  chain: "zap",
  mine: "ember",
};

const SPARK_SIZE = 15;
const CENTER = (SPARK_SIZE - 1) / 2;

const SPARK_COLORS: Readonly<Record<SparkStyle, readonly [string, string, string, string]>> = {
  hot: ["#ffffff", "#fff1a8", "#ffcd75", "#ef7d57"],
  zap: ["#ffffff", "#c8fff8", "#73eff7", "#41a6f6"],
  ember: ["#fff1a8", "#ffcd75", "#ef7d57", "#b13e53"],
  shard: ["#ffffff", "#f4d8ff", "#d8a8ff", "#73eff7"],
  chip: ["#ffffff", "#f0c890", "#c8905a", "#8a6a5a"],
  ring: ["#ffffff", "#c8fff0", "#6ae8d0", "#2fb8a8"],
};

const ZAP_ARMS: readonly (readonly [number, number])[][] = [
  [[1, 0], [2, -1], [3, -1], [4, 0], [5, 1], [6, 1]],
  [[-1, -1], [-1, -2], [-2, -3], [-2, -4], [-1, -5], [-2, -6]],
  [[-1, 1], [-2, 1], [-3, 2], [-4, 2], [-5, 3], [-6, 3]],
  [[0, 1], [1, 2], [1, 3], [0, 4], [1, 5], [2, 6]],
];

const CHIPS: readonly (readonly [number, number])[] = [[-4, -3], [3, -4], [5, 1], [-5, 2], [1, 4]];

function grid(width: number, height: number, paint: (x: number, y: number) => string | null): ColorGrid {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => paint(x, y)));
}

function hot(frame: number, dx: number, dy: number, colors: readonly [string, string, string, string]): string | null {
  const [core, bright, warm, ember] = colors;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const straight = ax === 0 || ay === 0;
  const diagonal = ax === ay;
  const reach = Math.max(ax, ay);
  if (frame === 0) {
    return reach <= 1 && straight ? core : straight && reach <= 3 ? bright : diagonal && reach <= 2 ? warm : null;
  }
  if (frame === 1) {
    return straight && reach >= 2 && reach <= 6 ? (reach <= 4 ? bright : warm) : diagonal && reach >= 2 && reach <= 3 ? warm : reach === 0 ? core : null;
  }
  return (straight && reach === 7) || (diagonal && reach === 4) ? ember : null;
}

function zap(frame: number, dx: number, dy: number, colors: readonly [string, string, string, string]): string | null {
  const [core, bright, glow, deep] = colors;
  if (dx === 0 && dy === 0) {
    return frame < 2 ? core : null;
  }
  for (const arm of ZAP_ARMS) {
    const step = arm.findIndex(([x, y]) => x === dx && y === dy);
    if (step < 0) {
      continue;
    }
    if (frame === 0) {
      return step < 2 ? bright : step < 3 ? glow : null;
    }
    if (frame === 1) {
      return step < 3 ? bright : glow;
    }
    return step >= 4 && step % 2 === 1 ? deep : null;
  }
  return frame === 0 && Math.abs(dx) + Math.abs(dy) === 1 ? glow : null;
}

function ember(frame: number, dx: number, dy: number, colors: readonly [string, string, string, string]): string | null {
  const [core, hotColor, warm, smoke] = colors;
  const distance = Math.hypot(dx, dy);
  const fleck = (dx * 5 + dy * 3 + 64) % 4 === 0;
  if (frame === 0) {
    return distance <= 1 ? core : distance <= 2.3 ? hotColor : distance <= 3.2 && fleck ? warm : null;
  }
  if (frame === 1) {
    return distance <= 1.5 ? hotColor : distance <= 2.6 ? warm : distance >= 3.5 && distance <= 5.5 && fleck ? warm : null;
  }
  return distance >= 4.5 && distance <= 6.8 && fleck ? smoke : null;
}

function shard(frame: number, dx: number, dy: number, colors: readonly [string, string, string, string]): string | null {
  const [core, light, base, edge] = colors;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (frame === 0) {
    return ax <= 1 && ay <= 1 ? (ax + ay === 0 ? core : light) : ax + ay === 2 && (ax === 2 || ay === 2) ? base : null;
  }
  const at = frame === 1 ? 3 : 5;
  const inBox = ax >= at && ax <= at + 1 && ay >= at && ay <= at + 1;
  if (frame === 1) {
    return inBox ? (ax === at && ay === at ? light : base) : ax === 0 && ay === 0 ? core : null;
  }
  return ax === at && ay === at ? edge : null;
}

function chip(frame: number, dx: number, dy: number, colors: readonly [string, string, string, string]): string | null {
  const [core, light, base, dust] = colors;
  if (frame === 0) {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    return ax <= 1 && ay <= 1 ? (ax + ay <= 1 ? core : light) : (ax === 2 && ay === 0) || (ay === 2 && ax === 0) ? base : null;
  }
  const scale = frame === 1 ? 1 : 1.4;
  const fall = frame === 1 ? 0 : 2;
  for (const [cx, cy] of CHIPS) {
    const x = Math.round(cx * scale);
    const y = Math.round(cy * scale) + fall;
    if (frame === 1 && dx >= x && dx <= x + 1 && dy >= y && dy <= y + 1) {
      return dx === x && dy === y ? light : base;
    }
    if (frame === 2 && dx === x && dy === y) {
      return dust;
    }
  }
  return null;
}

function ring(frame: number, dx: number, dy: number, colors: readonly [string, string, string, string]): string | null {
  const [core, light, base, deep] = colors;
  const distance = Math.hypot(dx, dy);
  const radius = [2, 4.5, 6.5][frame] ?? 6.5;
  if (Math.abs(distance - radius) <= 0.6) {
    if (frame === 2) {
      return (dx + dy + 64) % 2 === 0 ? deep : null;
    }
    return frame === 0 ? light : base;
  }
  if (frame === 0 && distance < 0.5) {
    return core;
  }
  return frame === 1 && Math.abs(distance - radius) <= 1.3 && dy < 0 ? light : null;
}

const PAINT: Readonly<Record<SparkStyle, typeof hot>> = { hot, zap, ember, shard, chip, ring };

function sparkFrame(style: SparkStyle, frame: number): ColorGrid {
  const colors = SPARK_COLORS[style];
  return grid(SPARK_SIZE, SPARK_SIZE, (x, y) => PAINT[style](frame, x - CENTER, y - CENTER, colors));
}

export function sparkFrames(): ColorGrid[] {
  return SPARK_STYLES.flatMap((style) => Array.from({ length: SPARK_FRAMES }, (_, frame) => sparkFrame(style, frame)));
}

export function sparkFrameIndex(style: SparkStyle, frame: number): number {
  return SPARK_STYLES.indexOf(style) * SPARK_FRAMES + frame;
}

export type MarkSize = "small" | "medium" | "large" | "crater";

export const MARK_SIZES: readonly MarkSize[] = ["small", "medium", "large", "crater"];

const MARK_RADIUS: Readonly<Record<MarkSize, number>> = { small: 5, medium: 7.5, large: 10, crater: 12.5 };

export const MARK_WIDTH = 32;

function spike(angle: number, size: MarkSize): number {
  const seed = MARK_SIZES.indexOf(size) * 7 + 3;
  return 1 + 0.32 * Math.sin(angle * 5 + seed) + 0.18 * Math.sin(angle * 9 + seed * 2);
}

function markFrame(size: MarkSize, ground: string, faded: boolean): ColorGrid {
  const stain = mix(ground, "#1a1c2c", 0.5);
  const deep = mix(ground, "#1a1c2c", 0.72);
  const rim = mix(ground, "#ffffff", 0.22);
  const radius = MARK_RADIUS[size];
  const center = (MARK_WIDTH - 1) / 2;
  return grid(MARK_WIDTH, MARK_WIDTH, (x, y) => {
    if (faded && (x + y) % 2 === 0) {
      return null;
    }
    const dx = x - center;
    const dy = y - center;
    const distance = Math.hypot(dx, dy);
    const edge = radius * spike(Math.atan2(dy, dx), size);
    if (size === "crater") {
      if (distance <= radius * 0.55) {
        return deep;
      }
      if (distance <= radius * 0.8) {
        return stain;
      }
      return distance <= radius * 0.98 ? rim : null;
    }
    if (distance <= edge * 0.45) {
      return deep;
    }
    if (distance <= edge) {
      return stain;
    }
    const fleck = (x * 7 + y * 13 + MARK_SIZES.indexOf(size)) % 11 === 0;
    return fleck && distance <= edge + 3 ? stain : null;
  });
}

export function markFrames(ground: string): ColorGrid[] {
  return MARK_SIZES.flatMap((size) => [markFrame(size, ground, false), markFrame(size, ground, true)]);
}

export function markFrameIndex(size: MarkSize, faded: boolean): number {
  return MARK_SIZES.indexOf(size) * 2 + (faded ? 1 : 0);
}
