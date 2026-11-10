import { CanvasTexture, NearestFilter, RepeatWrapping, SRGBColorSpace } from "three";
import { PALETTE } from "../art/palette";
import { shade, type ColorGrid } from "../art/shade";
import type { Sprite } from "../art/sprites";

export interface SpriteImage {
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
}

export function spriteImage(layers: readonly Sprite[], faction: string = PALETTE.r): SpriteImage {
  const width = Math.max(...layers.flatMap((layer) => layer.map((row) => row.length)));
  const height = Math.max(...layers.map((layer) => layer.length));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return { canvas, width, height };
  }
  shade(layers, faction).forEach((row, y) =>
    row.forEach((color, x) => {
      if (color) {
        context.fillStyle = color;
        context.fillRect(x, y, 1, 1);
      }
    }),
  );
  return { canvas, width, height };
}

export interface AtlasImage extends SpriteImage {
  readonly frames: number;
}

export function atlasImage(frames: readonly ColorGrid[]): AtlasImage {
  const width = Math.max(...frames.map((frame) => Math.max(...frame.map((row) => row.length))));
  const height = Math.max(...frames.map((frame) => frame.length));
  const canvas = document.createElement("canvas");
  canvas.width = width * frames.length;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    frames.forEach((frame, index) => {
      const left = index * width + Math.floor((width - (frame[0]?.length ?? 0)) / 2);
      const top = height - frame.length;
      frame.forEach((row, y) =>
        row.forEach((color, x) => {
          if (color) {
            context.fillStyle = color;
            context.fillRect(left + x, top + y, 1, 1);
          }
        }),
      );
    });
  }
  return { canvas, width, height, frames: frames.length };
}

export function pixelTexture(image: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(image);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export const GROUND_TILE = 64;

export function groundTexture(seed: number, base: readonly [string, string, string, string]): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = GROUND_TILE;
  canvas.height = GROUND_TILE;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = base[0];
    context.fillRect(0, 0, GROUND_TILE, GROUND_TILE);
    let state = seed >>> 0;
    const next = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state;
    };
    for (let index = 0; index < 900; index += 1) {
      const value = next();
      const x = value % GROUND_TILE;
      const y = (value >>> 8) % GROUND_TILE;
      const shade = (value >>> 16) % 10;
      context.fillStyle = shade < 6 ? base[1] : shade < 9 ? base[2] : base[3];
      context.fillRect(x, y, shade < 8 ? 1 : 2, 1);
    }
  }
  const texture = pixelTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

export function circleTexture(size: number, color: string, alpha: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const half = size / 2;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (x + 0.5 - half) / half;
        const dy = (y + 0.5 - half) / half;
        const distance = dx * dx + dy * dy;
        if (distance <= 1) {
          context.globalAlpha = alpha * (distance > 0.55 ? 0.6 : 1);
          context.fillStyle = color;
          context.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  return pixelTexture(canvas);
}

export function glowTexture(size: number, color: string, alpha: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export interface PatchLook {
  readonly base: string;
  readonly mark: string;
  readonly rim: string;
  readonly pattern: "speckle" | "coins" | "stripes" | "waves";
}

export function patchTexture(look: PatchLook): CanvasTexture {
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const half = size / 2;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (x + 0.5 - half) / half;
        const dy = (y + 0.5 - half) / half;
        const distance = dx * dx + dy * dy;
        if (distance > 1) {
          continue;
        }
        context.fillStyle = distance > 0.8 ? look.rim : patchMark(look.pattern, x, y) ? look.mark : look.base;
        context.fillRect(x, y, 1, 1);
      }
    }
  }
  return pixelTexture(canvas);
}

function patchMark(pattern: PatchLook["pattern"], x: number, y: number): boolean {
  switch (pattern) {
    case "speckle":
      return (x * 7 + y * 13) % 11 === 0 || (x * 5 + y * 3) % 17 === 0;
    case "coins": {
      const cx = (x % 12) - 6;
      const cy = (y % 12) - 6;
      const ring = cx * cx + cy * cy;
      return ring >= 6 && ring <= 14;
    }
    case "stripes":
      return Math.floor((x + y) / 4) % 2 === 0;
    case "waves":
      return (y + Math.round(Math.sin(x / 3) * 2)) % 8 === 0;
  }
}
