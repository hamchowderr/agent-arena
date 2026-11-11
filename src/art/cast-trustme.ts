import type { RegularKind } from "../sim/arena/content";
import type { Pose } from "./cast";
import { type Act, moodFor, eye, eyes, light, mouth, RAMPS, tinted } from "./form";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

const { paper, blue, yellow, green, purple, charcoal, teal, steel, coral, magenta, orange, red } = RAMPS;

function hallucinationJelly(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(18, 18);
  const pulse = frame % 2;
  for (const x of [5, 8, 11, 14]) {
    const wave = (x + frame) % 2;
    r.line(x, 9, x + wave - 1 + (x % 3 === 0 ? 1 : 0), 17 - pulse, magenta.light);
  }
  r.ellipse(9, 6 + pulse, 7 - pulse * 0.5, 5, magenta.base);
  light(r, magenta);
  r.rect(3, 10 + pulse, 13, 1, magenta.shadow);
  r.set(5, 3 + pulse, "w").set(6, 2 + pulse, "w");
  eyes(r, 7, 6 + pulse, 4, moodFor(act, "fake"));
  mouth(r, 8, 8 + pulse, 4, "smirk");
  r.set(16, 1, yellow.light).set(15, 2, yellow.light).set(17, 2, yellow.light).set(16, 3, yellow.light).set(16, 2, yellow.hi);
  r.set(4, 6 + pulse, magenta.hi).set(13, 4 + pulse, magenta.hi).set(6, 8 + pulse, coral.light).set(13, 8 + pulse, coral.light);
  return tinted(r);
}

function chunkStar(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(24, 22);
  const twist = frame % 2;
  const arms: readonly (readonly [number, number])[] = [[12, 0 + twist], [23, 8], [19, 21 - twist], [5, 21], [0, 8 + twist]];
  const inner: readonly (readonly [number, number])[] = [[15, 7], [16, 12], [12, 15], [8, 12], [9, 7]];
  r.polygon(arms.flatMap((arm, i) => [arm, inner[(i + 0) % 5] ?? arm]), orange.base);
  r.ellipse(12, 11, 5, 5, orange.base);
  light(r, orange);
  for (const [x, y] of [[12, 4], [18, 9], [16, 16], [8, 16], [6, 9]] as const) {
    r.set(x, y, orange.hi);
  }
  for (const [x, y] of [[12, 3], [20, 8], [18, 18], [6, 18], [3, 8]] as const) {
    r.line(12, 11, x, y, orange.shadow);
  }
  r.ellipse(12, 11, 3.5, 3, orange.light);
  r.line(16, 5, 18, 8, "k").set(17, 7, "w").set(21, 1, yellow.light).set(20, 2, yellow.hi).set(22, 2, yellow.light);
  eyes(r, 9, 10, 4, moodFor(act, "worried"));
  mouth(r, 10, 13, 4, "wobble");
  r.set(8, 12, coral.base).set(15, 12, coral.base);
  return tinted(r);
}

function confidentParrot(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(22, 26);
  const windup = act === "windup";
  const talk = windup ? 2 : frame % 2;
  const chest = windup ? 1 + (frame % 2) : 0;
  r.polygon([[6, 15], [1, 25], [4, 25], [8, 18]], green.shadow);
  r.ellipse(10, 15, 6 + chest, 7, green.base).ellipse(13, 7, 5, 5, green.base);
  light(r, green);
  r.polygon([[6, 13], [11, 12], [12, 19], [7, 20]], green.shadow);
  r.polygon([[17, 6], [21, 8], [19, 11 + talk], [17, 10]], yellow.base);
  light(r, yellow);
  r.line(17, 9, 19, 9 + talk, "k");
  r.rect(8, 1, 10, 2, charcoal.base).rect(11, 3, 5, 1, charcoal.base);
  light(r, charcoal);
  r.line(17, 2, 18, 5, red.light).set(18, 6, red.base);
  if (windup) {
    r.rect(18, 9, 2, 1 + talk, red.base);
    r.rect(20, 0, 1, 3, yellow.hi).set(20, 4, yellow.hi);
  }
  eye(r, 14, 6, moodFor(act, "smug"));
  r.line(8, 22, 8, 25, charcoal.base).line(12, 22, 12, 25, charcoal.base).rect(8, 25, 6, 1, charcoal.shadow);
  return tinted(r);
}

function deepAngler(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(34, 26);
  const glow = frame % 2;
  r.polygon([[6, 13], [0, 7], [1, 13], [0, 19]], blue.shadow);
  r.ellipse(17, 14, 12, 9, blue.base);
  light(r, blue);
  r.polygon([[20, 17], [30, 13], [31, 19], [22, 21]], charcoal.base);
  for (const x of [23, 26, 29]) {
    r.set(x, 16 - Math.floor((x - 23) / 3), "w").set(x + 1, 20 - Math.floor((x - 23) / 4), "w");
  }
  r.line(17, 5, 23, 1, steel.base).line(23, 1, 28, 3, steel.base);
  r.ellipse(29, 5, 2.5 + glow * 0.5, 2.5 + glow * 0.5, yellow.light);
  r.set(29, 5, yellow.hi).ring(29, 5, 2, 2, 1, yellow.base);
  r.line(31, 7, 33, 9, steel.shadow);
  eye(r, 22, 10, moodFor(act, "angry"));
  r.polygon([[12, 22], [16, 25], [19, 22]], blue.shadow);
  return tinted(r);
}

function citationOctopus(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(34, 34);
  const curl = frame % 2;
  for (const [x, side] of [[7, -1], [12, -1], [17, 1], [22, 1], [27, 1]] as const) {
    r.line(x, 20, x + side * (2 + curl), 31, purple.base).line(x + 1, 20, x + 1 + side * (2 + curl), 31, purple.base);
    r.set(x + side * (3 + curl), 32, purple.base);
  }
  r.ellipse(17, 13, 11, 11, purple.base).ellipse(17, 20, 11, 4, purple.base);
  light(r, purple);
  for (const [x, y] of [[10, 9], [24, 8], [12, 16], [22, 15]] as const) {
    r.set(x, y, purple.shadow);
  }
  eyes(r, 13, 13, 6, moodFor(act, "smug"));
  r.rect(12, 11, 3, 1, "k").rect(19, 11, 3, 1, "k");
  mouth(r, 15, 17, 4, "smirk");
  const scrolls: readonly (readonly [number, number])[] = [[1, 22 - curl], [28, 21 + curl]];
  for (const [x, y] of scrolls) {
    r.rect(x, y, 5, 7, paper.light).rect(x, y, 5, 1, paper.shadow).rect(x, y + 6, 5, 1, paper.shadow);
    r.rect(x + 1, y + 2, 3, 1, steel.shadow).rect(x + 1, y + 4, 2, 1, steel.shadow);
  }
  r.set(31, 2, coral.light).set(30, 3, coral.light).set(32, 3, coral.light).set(31, 4, coral.light);
  return tinted(r);
}

function sourceSeahorse(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(20, 26);
  const bob = frame % 2;
  const y = bob;
  r.ellipse(9, 13 + y, 5, 6, teal.base).ellipse(10, 5 + y, 4, 3.5, teal.base);
  r.polygon([[13, 4 + y], [18, 5 + y], [18, 7 + y], [13, 7 + y]], teal.base);
  r.polygon([[7, 18 + y], [11, 18 + y], [9, 24], [5, 25], [4, 23], [7, 22]], teal.base);
  light(r, teal);
  for (const row of [9, 12, 15]) {
    r.rect(6, row + y, 5, 1, teal.shadow);
  }
  r.polygon([[4, 8 + y], [2, 12 + y], [4, 16 + y]], teal.light);
  r.set(7, 1 + y, teal.light).set(9, 0 + y, teal.light).set(11, 1 + y, teal.light);
  eye(r, 10, 4 + y, moodFor(act, "worried"));
  r.ellipse(15, 14 + y, 3, 3, green.base);
  light(r, green);
  r.set(14, 14 + y, "w").set(15, 15 + y, "w").set(16, 14 + y, "w").set(17, 13 + y, "w");
  r.rect(17, 0 + bob, 1, 2, blue.light);
  return tinted(r);
}

export const TRUSTME_DEPTHS: Readonly<Partial<Record<RegularKind, Pose>>> = {
  grunt: hallucinationJelly,
  splitter: chunkStar,
  shooter: confidentParrot,
  brute: deepAngler,
  heavy: citationOctopus,
  lootRunner: sourceSeahorse,
};
