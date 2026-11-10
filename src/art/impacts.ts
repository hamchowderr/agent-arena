import { mix } from "./animate";
import type { ColorGrid } from "./shade";

export const SPARK_FRAMES = 3;

const SPARK_SIZE = 15;
const SPARK_CORE = "#ffffff";
const SPARK_HOT = "#fff1a8";
const SPARK_WARM = "#ffcd75";
const SPARK_EMBER = "#ef7d57";

function grid(width: number, height: number, paint: (x: number, y: number) => string | null): ColorGrid {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => paint(x, y)));
}

function sparkFrame(frame: number): ColorGrid {
  const center = (SPARK_SIZE - 1) / 2;
  return grid(SPARK_SIZE, SPARK_SIZE, (x, y) => {
    const dx = Math.abs(x - center);
    const dy = Math.abs(y - center);
    const straight = dx === 0 || dy === 0;
    const diagonal = dx === dy;
    const reach = Math.max(dx, dy);
    if (frame === 0) {
      return reach <= 1 && straight ? SPARK_CORE : straight && reach <= 3 ? SPARK_HOT : diagonal && reach <= 2 ? SPARK_WARM : null;
    }
    if (frame === 1) {
      return straight && reach >= 2 && reach <= 6 ? (reach <= 4 ? SPARK_HOT : SPARK_WARM) : diagonal && reach >= 2 && reach <= 3 ? SPARK_WARM : reach === 0 ? SPARK_CORE : null;
    }
    return (straight && reach === 7) || (diagonal && reach === 4) ? SPARK_EMBER : null;
  });
}

export function sparkFrames(): ColorGrid[] {
  return Array.from({ length: SPARK_FRAMES }, (_, frame) => sparkFrame(frame));
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
