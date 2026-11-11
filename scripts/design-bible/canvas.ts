import { crc32 } from "../../src/art/sheet";
import { rgbOf } from "../../src/art/audit";
import type { ColorGrid } from "../../src/art/shade";

export class Canvas {
  readonly rgba: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.rgba = new Uint8Array(width * height * 4);
  }

  set(x: number, y: number, hex: string, alpha = 1): void {
    const column = Math.round(x);
    const row = Math.round(y);
    if (column < 0 || row < 0 || column >= this.width || row >= this.height) {
      return;
    }
    const { r, g, b } = rgbOf(hex);
    const at = (row * this.width + column) * 4;
    const keep = 1 - alpha;
    const old = this.rgba[at + 3] === 0 ? null : [this.rgba[at] ?? 0, this.rgba[at + 1] ?? 0, this.rgba[at + 2] ?? 0];
    this.rgba[at] = old ? Math.round(r * alpha + (old[0] ?? 0) * keep) : r;
    this.rgba[at + 1] = old ? Math.round(g * alpha + (old[1] ?? 0) * keep) : g;
    this.rgba[at + 2] = old ? Math.round(b * alpha + (old[2] ?? 0) * keep) : b;
    this.rgba[at + 3] = old ? 255 : Math.round(255 * alpha);
  }

  fill(x: number, y: number, width: number, height: number, hex: string): void {
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
        this.set(column, row, hex);
      }
    }
  }

  draw(grid: ColorGrid, x: number, y: number, flip = false): void {
    const width = grid[0]?.length ?? 0;
    grid.forEach((row, gridY) =>
      row.forEach((color, gridX) => {
        if (color !== null) {
          this.set(Math.round(x) + (flip ? width - 1 - gridX : gridX), Math.round(y) + gridY, color);
        }
      }),
    );
  }

  drawCentered(grid: ColorGrid, cx: number, cy: number, flip = false): void {
    this.draw(grid, Math.round(cx - (grid[0]?.length ?? 0) / 2), Math.round(cy - grid.length / 2), flip);
  }

  drawFeet(grid: ColorGrid, cx: number, feetY: number, flip = false): void {
    this.draw(grid, Math.round(cx - (grid[0]?.length ?? 0) / 2), Math.round(feetY - grid.length), flip);
  }

  drawRotated(grid: ColorGrid, cx: number, cy: number, angle: number): void {
    const height = grid.length;
    const width = grid[0]?.length ?? 0;
    const reach = Math.ceil(Math.hypot(width, height) / 2) + 1;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let dy = -reach; dy <= reach; dy += 1) {
      for (let dx = -reach; dx <= reach; dx += 1) {
        const sx = Math.round(dx * cos + dy * sin + width / 2 - 0.5);
        const sy = Math.round(-dx * sin + dy * cos + height / 2 - 0.5);
        const color = grid[sy]?.[sx];
        if (color) {
          this.set(Math.round(cx) + dx, Math.round(cy) + dy, color);
        }
      }
    }
  }

  ring(cx: number, cy: number, radius: number, hex: string, alpha = 1): void {
    const steps = Math.max(24, Math.round(radius * 7));
    for (let index = 0; index < steps; index += 1) {
      const angle = (index / steps) * Math.PI * 2;
      this.set(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * 0.75, hex, alpha);
    }
  }

  disc(cx: number, cy: number, radius: number, paint: (x: number, y: number, edge: number) => string | null): void {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const distance = Math.hypot(dx, dy / 0.75) / radius;
        if (distance <= 1) {
          const color = paint(Math.round(cx + dx), Math.round(cy + dy), distance);
          if (color) {
            this.set(cx + dx, cy + dy, color);
          }
        }
      }
    }
  }
}

export interface Encoder {
  readonly deflate: (bytes: Uint8Array) => Uint8Array;
  readonly base64: (bytes: Uint8Array) => string;
}

let encoder: Encoder | null = null;

export function useEncoder(next: Encoder): void {
  encoder = next;
}

function u32(value: number): number[] {
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
}

function join(parts: readonly (Uint8Array | readonly number[])[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const body = join([[...type].map((letter) => letter.charCodeAt(0)), data]);
  return join([u32(data.length), body, u32(crc32(body))]);
}

function pngUri(width: number, height: number, rgba: Uint8Array): string {
  if (!encoder) {
    throw new Error("call useEncoder before drawing");
  }
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const header = join([u32(width), u32(height), [8, 6, 0, 0, 0]]);
  const png = join([[137, 80, 78, 71, 13, 10, 26, 10], chunk("IHDR", header), chunk("IDAT", encoder.deflate(raw)), chunk("IEND", new Uint8Array())]);
  return `data:image/png;base64,${encoder.base64(png)}`;
}

export interface Strip {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly frames: number;
}

export function stripOf(frames: readonly ColorGrid[], pad = 1): Strip {
  const width = Math.max(1, ...frames.map((frame) => frame[0]?.length ?? 0)) + pad * 2;
  const height = Math.max(1, ...frames.map((frame) => frame.length)) + pad * 2;
  const canvas = new Canvas(width * frames.length, height);
  frames.forEach((frame, index) => canvas.drawFeet(frame, index * width + width / 2, height - pad));
  return { src: pngUri(canvas.width, canvas.height, canvas.rgba), width, height, frames: frames.length };
}

export function canvasStrip(frames: readonly Canvas[]): Strip {
  const first = frames[0];
  const width = first?.width ?? 1;
  const height = first?.height ?? 1;
  const sheet = new Uint8Array(width * frames.length * height * 4);
  frames.forEach((frame, index) => {
    for (let y = 0; y < height; y += 1) {
      sheet.set(frame.rgba.subarray(y * width * 4, (y + 1) * width * 4), (y * width * frames.length + index * width) * 4);
    }
  });
  return { src: pngUri(width * frames.length, height, sheet), width, height, frames: frames.length };
}
