import { clearFrame, composite, createFrame, createFx, type PixelFrame, type PixelFx, type PixelFxModule } from "pixelfx/core";
import * as cartoonPow from "pixelfx/fx/explosions/cartoon-pow.js";
import * as hitSpark from "pixelfx/fx/impacts/hit-spark.js";
import * as groundSlam from "pixelfx/fx/impacts/ground-slam.js";
import * as collectBurst from "pixelfx/fx/pickups/collect-burst.js";
import * as poof from "pixelfx/fx/spawn/poof.js";

export type EffectName = "poof" | "spark" | "slam" | "pow" | "burst";

const MODULES: Readonly<Record<EffectName, PixelFxModule>> = {
  poof,
  spark: hitSpark,
  slam: groundSlam,
  pow: cartoonPow,
  burst: collectBurst,
};

const SCALE: Readonly<Record<EffectName, number>> = { poof: 0.32, spark: 0.3, slam: 0.42, pow: 0.45, burst: 0.4 };
const MAX_LIVE = 28;

interface Live {
  readonly fx: PixelFx;
  readonly frame: PixelFrame;
  readonly image: ImageData;
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly originX: number;
  readonly originY: number;
  readonly scale: number;
  readonly worldX: number;
  readonly worldY: number;
}

export class Effects {
  private readonly live: Live[] = [];
  private seed = 1;

  spawn(name: EffectName, worldX: number, worldY: number, options: Readonly<Record<string, unknown>> = {}): void {
    if (this.live.length >= MAX_LIVE) {
      return;
    }
    const module = MODULES[name];
    const [width, height] = module.meta.size ?? [96, 96];
    const [originX, originY] = module.meta.origin ?? [width / 2, height / 2];
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    this.seed += 1;
    this.live.push({
      fx: createFx(module, { x: originX, y: originY, seed: this.seed, ...options }),
      frame: createFrame(width, height),
      image: new ImageData(width, height),
      canvas,
      context,
      originX,
      originY,
      scale: SCALE[name],
      worldX,
      worldY,
    });
  }

  draw(
    target: CanvasRenderingContext2D,
    seconds: number,
    project: (x: number, y: number) => { readonly x: number; readonly y: number },
    pixelsPerUnit: number,
  ): void {
    for (const effect of this.live) {
      effect.fx.update(seconds);
      clearFrame(effect.frame);
      effect.fx.draw(effect.frame);
      composite(effect.frame, effect.image.data, null);
      effect.context.putImageData(effect.image, 0, 0);
      const screen = project(effect.worldX, effect.worldY);
      const scale = effect.scale * pixelsPerUnit;
      target.drawImage(
        effect.canvas,
        Math.round(screen.x - effect.originX * scale),
        Math.round(screen.y - effect.originY * scale),
        Math.round(effect.canvas.width * scale),
        Math.round(effect.canvas.height * scale),
      );
    }
    for (let index = this.live.length - 1; index >= 0; index -= 1) {
      if (this.live[index]?.fx.done()) {
        this.live.splice(index, 1);
      }
    }
  }

  clear(): void {
    this.live.length = 0;
  }
}
