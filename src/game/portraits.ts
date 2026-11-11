import { agentBody } from "../art/agent";
import { bossSprite } from "../art/bosses";
import { guidePortrait, type PortraitLook } from "../art/portraits";
import type { ColorGrid } from "../art/shade";
import { spriteImage } from "../render/textures";
import type { WorldId } from "../sim/arena/content";
import type { Tier } from "../sim/tiers";

const cache = new Map<string, HTMLCanvasElement>();

function gridCanvas(grid: ColorGrid): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.height = grid.length;
  canvas.width = Math.max(...grid.map((row) => row.length));
  const context = canvas.getContext("2d");
  grid.forEach((row, y) =>
    row.forEach((color, x) => {
      if (color && context) {
        context.fillStyle = color;
        context.fillRect(x, y, 1, 1);
      }
    }),
  );
  return canvas;
}

function cached(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = make();
    cache.set(key, canvas);
  }
  return canvas;
}

export function guideCanvas(look: PortraitLook): HTMLCanvasElement {
  return cached(`guide.${look.face}.${look.talking}.${look.blink}`, () => gridCanvas(guidePortrait(look)));
}

export function agentCanvas(tier: Tier): HTMLCanvasElement {
  return cached(`agent.${tier}`, () => spriteImage([agentBody(tier)]).canvas);
}

export function bossCanvas(world: WorldId): HTMLCanvasElement {
  return cached(`boss.${world}`, () => spriteImage([bossSprite(world)]).canvas);
}
