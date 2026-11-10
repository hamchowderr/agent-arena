import { TRANSPARENT } from "./palette";
import type { Sprite } from "./sprites";

export class Raster {
  private readonly cells: string[][];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.cells = Array.from({ length: height }, () => Array.from({ length: width }, () => TRANSPARENT));
  }

  set(x: number, y: number, key: string): this {
    const row = this.cells[Math.round(y)];
    const column = Math.round(x);
    if (row && column >= 0 && column < this.width) {
      row[column] = key;
    }
    return this;
  }

  get(x: number, y: number): string {
    return this.cells[y]?.[x] ?? TRANSPARENT;
  }

  rect(x: number, y: number, width: number, height: number, key: string): this {
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
        this.set(column, row, key);
      }
    }
    return this;
  }

  ellipse(centerX: number, centerY: number, radiusX: number, radiusY: number, key: string): this {
    for (let row = Math.floor(centerY - radiusY); row <= Math.ceil(centerY + radiusY); row += 1) {
      for (let column = Math.floor(centerX - radiusX); column <= Math.ceil(centerX + radiusX); column += 1) {
        const dx = (column - centerX) / radiusX;
        const dy = (row - centerY) / radiusY;
        if (dx * dx + dy * dy <= 1) {
          this.set(column, row, key);
        }
      }
    }
    return this;
  }

  ring(centerX: number, centerY: number, radiusX: number, radiusY: number, thickness: number, key: string): this {
    for (let row = Math.floor(centerY - radiusY); row <= Math.ceil(centerY + radiusY); row += 1) {
      for (let column = Math.floor(centerX - radiusX); column <= Math.ceil(centerX + radiusX); column += 1) {
        const outer = ((column - centerX) / radiusX) ** 2 + ((row - centerY) / radiusY) ** 2;
        const inner = ((column - centerX) / Math.max(0.5, radiusX - thickness)) ** 2 + ((row - centerY) / Math.max(0.5, radiusY - thickness)) ** 2;
        if (outer <= 1 && inner > 1) {
          this.set(column, row, key);
        }
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, key: string): this {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let step = 0; step <= steps; step += 1) {
      this.set(x0 + ((x1 - x0) * step) / steps, y0 + ((y1 - y0) * step) / steps, key);
    }
    return this;
  }

  polygon(points: readonly (readonly [number, number])[], key: string): this {
    const ys = points.map(([, y]) => y);
    for (let row = Math.floor(Math.min(...ys)); row <= Math.ceil(Math.max(...ys)); row += 1) {
      const crossings: number[] = [];
      points.forEach(([x0, y0], index) => {
        const [x1, y1] = points[(index + 1) % points.length] ?? [x0, y0];
        if ((y0 <= row + 0.5 && y1 > row + 0.5) || (y1 <= row + 0.5 && y0 > row + 0.5)) {
          crossings.push(x0 + ((row + 0.5 - y0) / (y1 - y0)) * (x1 - x0));
        }
      });
      crossings.sort((a, b) => a - b);
      for (let index = 0; index + 1 < crossings.length; index += 2) {
        for (let column = Math.round(crossings[index] ?? 0); column < Math.round(crossings[index + 1] ?? 0); column += 1) {
          this.set(column, row, key);
        }
      }
    }
    return this;
  }

  sprite(): Sprite {
    return this.cells.map((row) => row.join(""));
  }
}

export function paint(raster: Raster, key: string, where: (x: number, y: number, current: string) => boolean): void {
  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      const current = raster.get(x, y);
      if (current !== TRANSPARENT && where(x, y, current)) {
        raster.set(x, y, key);
      }
    }
  }
}
