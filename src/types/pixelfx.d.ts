declare module "pixelfx/core" {
  export interface PixelFrame {
    readonly w: number;
    readonly h: number;
    readonly color: Uint32Array;
    readonly light: Uint32Array;
  }
  export interface PixelFxMeta {
    readonly size?: readonly [number, number];
    readonly origin?: readonly [number, number];
    readonly duration?: number;
  }
  export interface PixelFx {
    readonly meta: PixelFxMeta;
    update(seconds: number): void;
    draw(frame: PixelFrame, layer?: "back" | "front"): void;
    stop(): void;
    done(): boolean;
  }
  export interface PixelFxModule {
    readonly meta: PixelFxMeta;
  }
  export function createFrame(width: number, height: number, originX?: number, originY?: number): PixelFrame;
  export function clearFrame(frame: PixelFrame): PixelFrame;
  export function createFx(module: PixelFxModule, options?: Readonly<Record<string, unknown>>): PixelFx;
  export function composite(frame: PixelFrame, out: Uint8ClampedArray, background?: number | null, light?: number): Uint8ClampedArray;
}

declare module "pixelfx/fx/*" {
  import type { PixelFxMeta } from "pixelfx/core";
  export const meta: PixelFxMeta;
}
