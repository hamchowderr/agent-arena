import { px } from "./math";

export const GRID_CELL = px(24);

export interface Positioned {
  readonly id: number;
  x: number;
  y: number;
}

function key(cellX: number, cellY: number): number {
  return (cellX + 4096) * 8192 + (cellY + 4096);
}

export class Grid<T extends Positioned> {
  private readonly buckets = new Map<number, T[]>();
  private readonly spare: T[][] = [];

  rebuild(items: readonly T[]): void {
    for (const bucket of this.buckets.values()) {
      bucket.length = 0;
      this.spare.push(bucket);
    }
    this.buckets.clear();
    for (const item of items) {
      const cell = key(Math.floor(item.x / GRID_CELL), Math.floor(item.y / GRID_CELL));
      let bucket = this.buckets.get(cell);
      if (!bucket) {
        bucket = this.spare.pop() ?? [];
        this.buckets.set(cell, bucket);
      }
      bucket.push(item);
    }
  }

  forEachNear(x: number, y: number, radius: number, visit: (item: T) => unknown): void {
    const minX = Math.floor((x - radius) / GRID_CELL);
    const maxX = Math.floor((x + radius) / GRID_CELL);
    const minY = Math.floor((y - radius) / GRID_CELL);
    const maxY = Math.floor((y + radius) / GRID_CELL);
    for (let cellX = minX; cellX <= maxX; cellX += 1) {
      for (let cellY = minY; cellY <= maxY; cellY += 1) {
        const bucket = this.buckets.get(key(cellX, cellY));
        if (!bucket) {
          continue;
        }
        for (const item of bucket) {
          if (visit(item) === true) {
            return;
          }
        }
      }
    }
  }
}
