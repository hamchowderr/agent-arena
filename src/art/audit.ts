import type { ColorGrid } from "./shade";

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export function rgbOf(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function linear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const { r, g, b } = rgbOf(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

export function hueOf(hex: string): number {
  const { r, g, b } = rgbOf(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) {
    return 0;
  }
  const d = max - min;
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60;
}

export function chromaOf(hex: string): number {
  const { r, g, b } = rgbOf(hex);
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

export function hueGap(a: number, b: number): number {
  const gap = Math.abs(a - b) % 360;
  return gap > 180 ? 360 - gap : gap;
}

export function colorCount(grid: ColorGrid): number {
  return new Set(grid.flat().filter((color): color is string => color !== null)).size;
}

export function span(grid: ColorGrid): number {
  let top = Number.POSITIVE_INFINITY;
  let bottom = -1;
  let left = Number.POSITIVE_INFINITY;
  let right = -1;
  grid.forEach((row, y) =>
    row.forEach((color, x) => {
      if (color !== null) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }),
  );
  return bottom < 0 ? 0 : Math.max(bottom - top + 1, right - left + 1);
}

function isEdge(grid: ColorGrid, x: number, y: number): boolean {
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].some(([dx, dy]) => (grid[y + (dy ?? 0)]?.[x + (dx ?? 0)] ?? null) === null);
}

export function edgeColors(grid: ColorGrid): string[] {
  return grid.flatMap((row, y) => row.flatMap((color, x) => (color !== null && isEdge(grid, x, y) ? [color] : [])));
}

export function interiorColors(grid: ColorGrid): string[] {
  return grid.flatMap((row, y) => row.flatMap((color, x) => (color !== null && !isEdge(grid, x, y) ? [color] : [])));
}

export function dominantHue(grid: ColorGrid): number {
  let x = 0;
  let y = 0;
  for (const color of interiorColors(grid)) {
    const weight = chromaOf(color);
    if (weight >= 0.25) {
      const angle = (hueOf(color) * Math.PI) / 180;
      x += Math.cos(angle) * weight;
      y += Math.sin(angle) * weight;
    }
  }
  if (x === 0 && y === 0) {
    return 0;
  }
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function averageLuminance(colors: readonly string[]): number {
  return colors.length === 0 ? 0 : colors.reduce((sum, color) => sum + luminance(color), 0) / colors.length;
}

export function groundContrast(grid: ColorGrid, ground: string): number {
  const edge = averageLuminance(interiorColors(grid));
  const floor = luminance(ground);
  const [light, dark] = [edge, floor].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

function mask(grid: ColorGrid): Set<string> {
  const height = grid.length;
  const width = Math.max(0, ...grid.map((row) => row.length));
  const cells = new Set<string>();
  grid.forEach((row, y) =>
    row.forEach((color, x) => {
      if (color !== null) {
        cells.add(`${x - Math.floor(width / 2)},${y - height}`);
      }
    }),
  );
  return cells;
}

export function silhouetteOverlap(a: ColorGrid, b: ColorGrid): number {
  const left = mask(a);
  const right = mask(b);
  let shared = 0;
  for (const cell of left) {
    if (right.has(cell)) {
      shared += 1;
    }
  }
  const union = left.size + right.size - shared;
  return union === 0 ? 1 : shared / union;
}
