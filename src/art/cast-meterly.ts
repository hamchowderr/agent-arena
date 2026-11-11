import type { RegularKind } from "../sim/arena/content";
import type { Pose } from "./cast";
import { type Act, moodFor, eye, light, lightAll, RAMPS, tinted } from "./form";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

const { paper, blue, yellow, green, purple, charcoal, teal, steel, wood, coral, red } = RAMPS;

function invoiceTick(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(18, 14);
  [4, 7, 10, 12].forEach((x, i) => r.line(x, 11, x + ((frame + i) % 2 === 0 ? -1 : 1), 13, charcoal.base));
  r.ellipse(8, 7, 6.5, 5, coral.base).ellipse(15, 8, 2.5, 2, charcoal.base);
  lightAll(r, coral, charcoal);
  r.set(17, 8, charcoal.light);
  const sway = frame % 2;
  r.rect(4, 3 + sway, 7, 6, paper.light).rect(5, 4 + sway, 4, 1, steel.shadow).rect(5, 6 + sway, 5, 1, steel.shadow).rect(8, 8 + sway, 3, 1, coral.shadow);
  eye(r, 14, 7, moodFor(act, "bright"));
  return tinted(r);
}

function rateLimiterBeetle(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(26, 18);
  [5, 10, 15].forEach((x, i) => r.line(x, 14, x + ((frame + i) % 2 === 0 ? -1 : 1), 17, charcoal.base));
  r.ellipse(11, 10, 9, 5.5, blue.base).ellipse(20, 11, 3.5, 3, blue.base);
  r.polygon([[20, 9], [25, 2], [23, 9]], steel.base);
  lightAll(r, blue, steel);
  r.ellipse(10, 9, 4.5, 3.5, paper.light).rect(5, 10, 11, 3, ".");
  r.ellipse(11, 12, 9, 2.5, blue.shadow).rect(2, 10, 18, 2, ".");
  r.set(7, 7, "k").set(10, 6, "k").set(13, 7, "k");
  const needle = act === "windup" ? [14, 8 - (frame % 2)] : [[13, 7], [12, 6], [10, 6], [8, 7]][frame % 4] ?? [10, 6];
  r.line(10, 9, needle[0] ?? 10, needle[1] ?? 6, red.base);
  if (act === "windup") {
    r.rect(13, 7, 2, 2, red.light);
    for (const [x, y] of [[1, 4 + (frame % 2)], [0, 7 - (frame % 2)], [2, 1 + (frame % 2)]] as const) {
      r.rect(x, y, 2, 2, paper.light);
    }
  }
  eye(r, 20, 10, moodFor(act, "angry"));
  r.rect(21, 13, 2, 1, "k");
  return tinted(r);
}

function timeoutBeetle(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(22, 18);
  [5, 9, 13].forEach((x, i) => r.line(x, 14, x + ((frame + i) % 2 === 0 ? -1 : 1), 17, charcoal.base));
  const shell = act === "windup" && frame % 2 === 1 ? red : yellow;
  r.ellipse(10, 10, 8, 6, shell.base).ellipse(18, 11, 3, 3, charcoal.base);
  lightAll(r, shell, charcoal);
  r.rect(5, 3, 10, 1, wood.base).rect(5, 15, 10, 1, wood.base);
  r.polygon([[6, 4], [14, 4], [10, 9]], paper.light).polygon([[10, 9], [6, 14], [14, 14]], paper.light);
  const sand = act === "walk" ? 3 - (frame % 4) : 0;
  r.polygon([[10 - sand, 9 - sand], [10 + sand, 9 - sand], [10, 9]], yellow.shadow);
  r.rect(8 - frame % 2, 13, 5, 1, yellow.shadow).set(10, 10 + (frame % 3), yellow.shadow);
  r.line(19, 8, 21, 4, charcoal.light).set(21, 3, frame % 2 ? red.light : yellow.hi);
  if (act === "windup") {
    r.set(20, 2, yellow.hi).set(21, 1, red.light).set(20, 0, yellow.hi).set(19, 3 - (frame % 2), red.light);
    r.rect(6, 13, 9, 1, yellow.shadow);
  }
  eye(r, 18, 10, moodFor(act, "shocked"));
  return tinted(r);
}

function quotaCrab(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(32, 24);
  for (const [x, side] of [[9, -1], [12, -1], [20, 1], [23, 1]] as const) {
    r.line(x, 17, x + side * 2, 21 + ((frame + x) % 2), purple.shadow);
  }
  r.ellipse(16, 14, 10, 6, purple.base);
  r.line(13, 9, 13, 5, purple.base).line(19, 9, 19, 5, purple.base);
  r.polygon([[7, 14], [3, 11], [3, 7], [7, 10]], purple.base).polygon([[25, 14], [29, 11], [29, 7], [25, 10]], purple.base);
  lightAll(r, purple);
  const open = frame % 2 === 0 ? 2 : 0;
  r.line(3, 8, 0, 1, steel.light).line(4, 8, 3 - open, 0, steel.light).set(3, 8, steel.shadow);
  r.line(28, 8, 31, 1, steel.light).line(27, 8, 28 + open, 0, steel.light).set(28, 8, steel.shadow);
  if (act === "walk") {
    r.rect(12, 3, 2, 2, "w").set(13, 4, "k").rect(18, 3, 2, 2, "w").set(18, 4, "k");
  } else {
    eye(r, 12, 4, moodFor(act, "shocked"));
    eye(r, 18, 4, moodFor(act, "shocked"));
  }
  r.set(11, 2, "k").set(12, 2, "k").set(19, 2, "k").set(20, 2, "k");
  r.rect(13, 16, 6, 2, "k").set(14, 16, "w").set(16, 16, "w").set(18, 16, "w");
  return tinted(r);
}

function tollRaccoon(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(30, 32);
  const sway = frame % 2;
  r.ellipse(4, 22 - sway, 3.5, 7, steel.base);
  r.ellipse(15, 21, 8, 8, steel.base).ellipse(15, 11, 7, 5.5, steel.base);
  r.polygon([[8, 8], [9, 3], [12, 6]], steel.base).polygon([[22, 8], [21, 3], [18, 6]], steel.base);
  light(r, steel);
  for (const y of [17, 21, 25]) {
    r.rect(2, y - sway, 5, 2, charcoal.base);
  }
  r.ellipse(15, 23, 5, 5, paper.light);
  r.rect(8, 9, 15, 3, charcoal.base);
  r.rect(9, 3, 13, 3, green.base).rect(7, 6, 17, 1, green.shadow);
  lightAll(r, charcoal, green);
  r.rect(14, 4, 3, 1, yellow.light);
  eye(r, 11, 10, moodFor(act, "bright"));
  eye(r, 18, 10, moodFor(act, "bright"));
  r.set(15, 13, "k").rect(13, 14, 5, 1, "k");
  const reach = frame === 1 || frame === 2 ? 1 : 0;
  r.line(22, 19, 27, 16 - reach, steel.shadow).line(22, 20, 27, 17 - reach, steel.shadow).rect(27, 14 - reach, 2, 3, steel.light);
  r.rect(19, 22, 6, 6, teal.light).rect(20, 25, 4, 2, yellow.base).set(21, 24, yellow.light);
  r.ellipse(11, 30, 2.5, 1.5, charcoal.base).ellipse(19, 30, 2.5, 1.5, charcoal.base);
  return tinted(r);
}

function refundGecko(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(26, 14);
  const flip = frame % 2 === 0 ? 1 : -1;
  for (const [x, side] of [[8, -1], [15, 1]] as const) {
    r.line(x, 10, x + side * flip * 2, 13, teal.shadow);
    r.line(x + 1, 6, x + 1 - side * flip * 2, 3, teal.shadow);
  }
  r.polygon([[6, 7], [0, 10 + (frame % 2)], [1, 11 + (frame % 2)], [6, 10]], teal.base);
  r.ellipse(12, 8, 7, 3, teal.base).ellipse(20, 7, 3.5, 2.5, teal.base);
  light(r, teal);
  r.ellipse(24, 8, 2, 2, yellow.base);
  light(r, yellow);
  r.set(24, 8, yellow.shadow);
  eye(r, 20, 6, moodFor(act, "worried"));
  r.rect(23, 0 + (frame % 2), 1, 2, blue.light);
  return tinted(r);
}

export const METERED_MINES: Readonly<Partial<Record<RegularKind, Pose>>> = {
  grunt: invoiceTick,
  charger: rateLimiterBeetle,
  exploder: timeoutBeetle,
  brute: quotaCrab,
  heavy: tollRaccoon,
  lootRunner: refundGecko,
};
