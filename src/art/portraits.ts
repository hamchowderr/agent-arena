import type { Face } from "../game/story";
import { TRANSPARENT } from "./palette";
import { Raster } from "./raster";
import type { ColorGrid } from "./shade";

export const PORTRAIT_SIZE = 40;

const RAMPS = {
  skin: ["#e8b890", "#c88c62", "#a06844", "#74462c", "#2e160c"],
  hair: ["#6a5e5e", "#433a3c", "#2a2326", "#181316", "#080606"],
  hoodie: ["#8a90a0", "#626878", "#454a58", "#30343e", "#101216"],
  gold: ["#fff2d6", "#ecd4a8", "#d6b88c", "#a8804e", "#3a2414"],
  bronze: ["#d8a070", "#b07848", "#8c5e34", "#5e3a1e", "#22140a"],
  steel: ["#ffffff", "#c8ccd8", "#8a90a4", "#5a6074", "#1a1c26"],
} as const;

type RampName = keyof typeof RAMPS;

const NAMES = Object.keys(RAMPS) as RampName[];

const keyOf = (name: RampName, step: number): string => String.fromCharCode(0x2100 + NAMES.indexOf(name) * 5 + step);
const BASE = 2;

const COLORS = new Map<string, string>([
  ...NAMES.flatMap((name) => RAMPS[name].map((color, step) => [keyOf(name, step), color] as [string, string])),
  ["k", "#120c10"],
  ["w", "#fbf6ee"],
  ["r", "#c83a4a"],
  ["i", "#4a2a20"],
  ["c", "#c86a5a"],
]);

const rampOf = (key: string): RampName | undefined => {
  const code = key.charCodeAt(0) - 0x2100;
  return code >= 0 && code < NAMES.length * 5 ? NAMES[Math.floor(code / 5)] : undefined;
};

const SKIN = keyOf("skin", BASE);
const SKIN_SHADOW = keyOf("skin", 3);
const HAIR = keyOf("hair", BASE);
const HAIR_LIGHT = keyOf("hair", 1);
const HOODIE = keyOf("hoodie", BASE);
const HOODIE_SHADOW = keyOf("hoodie", 3);
const GOLD = keyOf("gold", BASE);
const GOLD_HI = keyOf("gold", 0);
const BRONZE = keyOf("bronze", BASE);
const STEEL = keyOf("steel", 3);

export interface PortraitLook {
  readonly face: Face;
  readonly talking: boolean;
  readonly blink: boolean;
}

function body(r: Raster): void {
  r.polygon(
    [
      [2, 40],
      [6, 32],
      [12, 29],
      [28, 29],
      [34, 32],
      [38, 40],
    ],
    HOODIE,
  );
  r.ellipse(20, 30, 8, 2.5, HOODIE_SHADOW);
  r.rect(17, 26, 7, 4, SKIN_SHADOW);
  r.line(16, 31, 15, 37, GOLD).line(24, 31, 25, 37, GOLD);
  r.set(15, 38, GOLD_HI).set(25, 38, GOLD_HI);
  r.rect(18, 34, 5, 1, BRONZE).rect(19, 35, 3, 1, BRONZE).set(20, 36, BRONZE);
}

function head(r: Raster): void {
  r.ellipse(9.5, 18.5, 1.6, 2.6, SKIN).ellipse(30.5, 18.5, 1.6, 2.6, SKIN);
  r.ellipse(20, 17, 10, 11, SKIN);
  r.rect(14, 26, 13, 1, SKIN);
  for (let y = 4; y <= 12; y += 1) {
    for (let x = 8; x <= 32; x += 1) {
      const dx = (x - 20) / 10.6;
      const dy = (y - 12) / 8;
      const hairline = y <= 9 || x <= 11 || x >= 29 || (y === 10 && (x <= 14 || x >= 26));
      if (dx * dx + dy * dy <= 1 && hairline) {
        r.set(x, y, HAIR);
      }
    }
  }
  r.rect(10, 11, 2, 4, HAIR).rect(29, 11, 2, 4, HAIR);
  for (const [x, y] of [[14, 6], [17, 5], [21, 5], [24, 6], [27, 8], [12, 8], [19, 7], [23, 8]] as const) {
    r.set(x, y, HAIR_LIGHT);
  }
  r.set(20, 21, SKIN_SHADOW).set(21, 21, SKIN_SHADOW).set(21, 20, SKIN_SHADOW);
}

function headphones(r: Raster): void {
  r.ring(20, 15, 12.5, 12.5, 1.6, GOLD);
  for (let y = 15; y <= 30; y += 1) {
    for (let x = 0; x < 40; x += 1) {
      if (rampOf(r.get(x, y)) === "gold") {
        r.set(x, y, TRANSPARENT);
      }
    }
  }
  r.rect(6, 14, 4, 9, GOLD).rect(30, 14, 4, 9, GOLD);
  r.rect(5, 16, 1, 5, BRONZE).rect(34, 16, 1, 5, BRONZE);
  r.line(8, 22, 13, 25, BRONZE);
  r.rect(13, 24, 3, 2, keyOf("hair", 3)).set(14, 24, STEEL);
}

function eyesFor(r: Raster, look: PortraitLook): void {
  const left = 14;
  const right = 24;
  const y = 17;
  if (look.blink) {
    r.rect(left, y + 1, 3, 1, "k").rect(right, y + 1, 3, 1, "k");
  } else if (look.face === "grin") {
    for (const x of [left, right]) {
      r.set(x, y + 1, "k").set(x + 1, y, "k").set(x + 2, y + 1, "k").set(x - 1, y + 2, "k").set(x + 3, y + 2, "k");
    }
  } else if (look.face === "shocked") {
    for (const x of [left, right]) {
      r.rect(x, y - 1, 3, 3, "w").set(x + 1, y, "k");
    }
  } else {
    for (const x of [left, right]) {
      r.rect(x, y - 1, 3, 3, "k").set(x, y - 1, "w").set(x + 2, y + 1, "i");
    }
  }
  if (look.face === "grin" || look.face === "smile") {
    r.rect(12, 21, 2, 1, "c").rect(27, 21, 2, 1, "c");
  }
  const brow = (x: number, tilt: number) => {
    r.set(x, 14 + Math.max(0, -tilt), HAIR).set(x + 1, 14, HAIR).set(x + 2, 14 + Math.max(0, tilt), HAIR);
  };
  if (look.face === "serious") {
    brow(left, 1);
    brow(right, -1);
  } else if (look.face === "smirk") {
    brow(left, 0);
    r.set(right, 13, HAIR).set(right + 1, 13, HAIR).set(right + 2, 14, HAIR);
  } else if (look.face === "shocked") {
    r.rect(left, 13, 3, 1, HAIR).rect(right, 13, 3, 1, HAIR);
  } else {
    r.rect(left, 14, 3, 1, HAIR).rect(right, 14, 3, 1, HAIR);
  }
}

function mouthFor(r: Raster, look: PortraitLook): void {
  if (look.talking) {
    const wide = look.face === "shocked" ? 3 : 5;
    const x = 20 - Math.floor(wide / 2);
    r.rect(x, 23, wide, 3, "k").set(x + 1, 25, "r");
    if (look.face === "grin") {
      r.rect(x + 1, 23, wide - 2, 1, "w");
    }
    return;
  }
  switch (look.face) {
    case "grin":
      r.rect(17, 23, 7, 1, "k").rect(18, 24, 5, 1, "w").rect(18, 25, 5, 1, "k").set(17, 24, "k").set(23, 24, "k");
      break;
    case "smile":
      r.set(17, 23, "k").rect(18, 24, 5, 1, "k").set(23, 23, "k");
      break;
    case "serious":
      r.rect(18, 24, 5, 1, "k");
      break;
    case "smirk":
      r.rect(18, 24, 4, 1, "k").set(22, 23, "k");
      break;
    case "shocked":
      r.rect(19, 23, 3, 3, "k").set(20, 24, "r");
      break;
  }
}

function lightRamps(r: Raster): void {
  const tones: [number, number, string][] = [];
  for (let y = 0; y < r.height; y += 1) {
    for (let x = 0; x < r.width; x += 1) {
      const name = rampOf(r.get(x, y));
      if (!name || r.get(x, y) !== keyOf(name, BASE)) {
        continue;
      }
      const same = (dx: number, dy: number) => rampOf(r.get(x + dx, y + dy)) === name;
      const tone = !same(0, -1) || !same(-1, 0) ? keyOf(name, 1) : !same(0, 1) || !same(1, 0) || !same(0, 2) ? keyOf(name, 3) : keyOf(name, BASE);
      tones.push([x, y, tone]);
    }
  }
  for (const [x, y, tone] of tones) {
    r.set(x, y, tone);
  }
}

function outline(r: Raster): ColorGrid {
  const filled = (x: number, y: number) => r.get(x, y) !== TRANSPARENT;
  return Array.from({ length: r.height }, (_, y) =>
    Array.from({ length: r.width }, (_, x) => {
      const key = r.get(x, y);
      if (key === TRANSPARENT) {
        return null;
      }
      const edge = !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || (!filled(x, y + 1) && y < r.height - 1);
      const name = rampOf(key);
      if (edge && name) {
        return RAMPS[name][4];
      }
      return COLORS.get(key) ?? null;
    }),
  );
}

export function guidePortrait(look: PortraitLook): ColorGrid {
  const r = new Raster(PORTRAIT_SIZE, PORTRAIT_SIZE);
  body(r);
  head(r);
  headphones(r);
  lightRamps(r);
  eyesFor(r, look);
  mouthFor(r, look);
  return outline(r);
}

export const PORTRAIT_FACES: readonly Face[] = ["smile", "grin", "serious", "smirk", "shocked"];
