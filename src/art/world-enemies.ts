import type { RegularKind, WorldId } from "../sim/arena/content";
import { ENEMY_SPRITES, outlined } from "./arena-sprites";
import { PROMPT_PLAINS, type Pose } from "./cast";
import { METERED_MINES } from "./cast-meterly";
import { MEMORY_LANE } from "./cast-notionally";
import { AUTOMATION_FACTORY } from "./cast-synergex";
import { TRUSTME_DEPTHS } from "./cast-trustme";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

function eye(r: Raster, x: number, y: number): void {
  r.set(x, y - 1, "k").set(x + 1, y - 1, "k").set(x, y, "w").set(x + 1, y, "k");
}

function done(r: Raster): Sprite {
  return outlined(r.sprite(), "k");
}

const POSES: Readonly<Partial<Record<WorldId, Partial<Record<RegularKind, Pose>>>>> = { hustlr: PROMPT_PLAINS, notionally: MEMORY_LANE, meterly: METERED_MINES, synergex: AUTOMATION_FACTORY, trustMe: TRUSTME_DEPTHS };

export function enemyPoses(world: WorldId, kind: RegularKind): Sprite[] | undefined {
  const pose = POSES[world]?.[kind];
  return pose ? [0, 1, 2, 3].map(pose) : undefined;
}

export function enemySprite(world: WorldId, kind: RegularKind): Sprite {
  return POSES[world]?.[kind]?.(0) ?? ENEMY_SPRITES[kind];
}

interface WallStyle {
  readonly body: string;
  readonly cap: string;
  readonly mark: (r: Raster) => void;
}

const WALL_STYLES: Readonly<Record<WorldId, WallStyle>> = {
  hustlr: {
    body: "3",
    cap: "0",
    mark: (r) => {
      for (let y = 8; y < 20; y += 3) {
        r.rect(0, y, 30, 1, "A");
        for (let x = (y % 2) * 3; x < 30; x += 6) {
          r.set(x, y + 1, "A").set(x, y + 2, "A");
        }
      }
      r.rect(9, 11, 12, 6, "C").rect(14, 12, 2, 4, "k").rect(13, 13, 4, 1, "k");
    },
  },
  notionally: {
    body: "C",
    cap: "D",
    mark: (r) => {
      ["4", "6", "1", "9", "A", "4", "2", "6", "9", "1"].forEach((key, index) => r.rect(1 + index * 3, 10, 2, 9, key));
    },
  },
  meterly: {
    body: "1",
    cap: "D",
    mark: (r) => {
      for (let x = -12; x < 30; x += 6) {
        r.line(x, 19, x + 11, 8, "D").line(x + 1, 19, x + 12, 8, "D");
      }
      r.rect(11, 11, 8, 5, "C").rect(13, 13, 4, 1, "k");
    },
  },
  synergex: {
    body: "5",
    cap: "Q",
    mark: (r) => {
      r.rect(0, 12, 30, 2, "Q");
      r.line(10, 16, 13, 19, "k").line(13, 19, 20, 9, "k");
    },
  },
  trustMe: {
    body: "4",
    cap: "9",
    mark: (r) => {
      for (const [x, y] of [[4, 11], [24, 13], [9, 17], [20, 18], [15, 12]] as const) {
        r.ellipse(x, y, 1.6, 1.6, "P").set(x - 1, y - 1, "w");
      }
    },
  },
};

export function wallSprite(world: WorldId): Sprite {
  const style = WALL_STYLES[world];
  const r = new Raster(30, 24);
  r.rect(0, 3, 30, 17, style.body);
  style.mark(r);
  r.rect(0, 1, 30, 3, style.cap).rect(2, 0, 26, 1, style.cap);
  eye(r, 9, 6);
  eye(r, 19, 6);
  r.rect(2, 20, 5, 4, "D").rect(23, 20, 5, 4, "D");
  return done(r);
}
