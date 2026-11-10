import { PALETTE, TRANSPARENT, type PaletteKey } from "./palette";
import type { Sprite } from "./sprites";

export function drawSprite(context: CanvasRenderingContext2D, layers: readonly Sprite[], x: number, y: number, scale: number, flip = false): void {
  for (const layer of layers) {
    layer.forEach((row, rowIndex) => {
      for (let column = 0; column < row.length; column += 1) {
        const key = row[column];
        if (key === undefined || key === TRANSPARENT) {
          continue;
        }
        context.fillStyle = PALETTE[key as PaletteKey];
        const drawColumn = flip ? row.length - 1 - column : column;
        context.fillRect(x + drawColumn * scale, y + rowIndex * scale, scale, scale);
      }
    });
  }
}
