import type { RegularKind } from "../sim/arena/content";
import type { Pose } from "./cast";
import { type Act, moodFor, eye, leg, light, lightAll, RAMPS, stride, tinted } from "./form";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

const { fur, paper, blue, yellow, green, purple, charcoal, teal, steel, wood, coral, red, magenta } = RAMPS;

function stepAnt(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(18, 15);
  [6, 9, 12].forEach((x, i) => r.line(x, 11, x + ((frame + i) % 2 === 0 ? -1 : 1), 14, charcoal.base));
  r.ellipse(4, 10, 3, 2.5, coral.base).ellipse(9, 10, 2, 1.5, coral.base).ellipse(14, 9, 2.5, 2.5, coral.base);
  lightAll(r, coral);
  r.line(15, 7, 17, 4 + (frame % 2), charcoal.base);
  const lift = frame % 2;
  r.rect(5, 1 + lift, 9, 6, paper.light).rect(6, 2 + lift, 7, 4, steel.base);
  r.rect(8, 3 + lift, 3, 2, "w").set(11, 3 + lift, "w").set(12, 4 + lift, "w").set(11, 5 + lift, "w");
  eye(r, 14, 8, moodFor(act, "eager"));
  return tinted(r);
}

function synergyBee(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(18, 15);
  const up = frame % 2 === 0;
  r.ellipse(8, up ? 3 : 5, 3.5, 2.5, paper.light);
  r.ellipse(8, 9, 5.5, 4, yellow.base).ellipse(14, 8, 2.5, 2.5, yellow.base);
  light(r, yellow);
  r.rect(5, 6, 1, 7, charcoal.base).rect(8, 5, 1, 8, charcoal.base);
  r.set(2, 9, charcoal.base).set(1, 9, charcoal.base);
  r.line(13, 10, 12, 14, red.base).rect(11, 13, 3, 2, red.light);
  eye(r, 14, 7, moodFor(act, "fake"));
  r.rect(14, 10, 2, 1, "k");
  r.ellipse(10, up ? 2 : 4, 3, 2, paper.base);
  return tinted(r);
}

function branchStick(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(26, 20);
  const sway = frame % 2;
  for (const [x, side] of [[6, -1], [11, 1], [16, -1]] as const) {
    r.line(x, 11, x + side * 2 * (frame % 2 ? 1 : -1), 19, green.light).line(x + 1, 11, x + 1 + side * 2 * (frame % 2 ? 1 : -1), 19, green.light);
  }
  r.rect(2, 8, 18, 4, green.base).rect(19, 7, 5, 4, green.base);
  r.line(10, 9, 14, 3 - sway, green.base).line(11, 9, 15, 3 - sway, green.base).line(14, 3 - sway, 18, 1 - sway, green.base).line(14, 3 - sway, 16, 6 - sway, green.base);
  r.set(18, 1 - sway, olive()).set(16, 6 - sway, olive()).set(19, 1 - sway, RAMPS.olive.shadow).set(17, 7 - sway, RAMPS.olive.base).set(18, 0, yellow.light);
  lightAll(r, green);
  for (const x of [5, 9, 13]) {
    r.set(x, 10, green.shadow);
  }
  r.line(23, 7, 25, 3 + sway, green.light).line(22, 7, 23, 3, green.light);
  eye(r, 21, 8, moodFor(act, "eager"));
  r.set(24, 10, "k");
  return tinted(r);
}

function olive(): string {
  return RAMPS.olive.light;
}

function blockerHippo(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(34, 26);
  [7, 13, 20, 25].forEach((x, i) => r.rect(x, 19 + (stride(frame, i % 2 ? 1 : -1) > 0 ? 1 : 0), 4, 6 - (stride(frame, i % 2 ? 1 : -1) > 0 ? 1 : 0), blue.base));
  r.ellipse(15, 14, 13, 8, blue.base).ellipse(27, 14, 6, 5, blue.base).ellipse(30, 15, 4, 4, blue.base);
  r.ellipse(24, 8, 1.5, 1.5, blue.base).ellipse(28, 8, 1.5, 1.5, blue.base);
  light(r, blue);
  r.set(32, 13, "k").set(33, 13, "k");
  eye(r, 26, 11, moodFor(act, "angry"));
  r.rect(29, 18, 4, 1, "k");
  r.line(12, 6, 12, 1, wood.base);
  r.polygon([[9, 0], [15, 0], [17, 2], [17, 5], [15, 7], [9, 7], [7, 5], [7, 2]], red.base);
  light(r, red);
  r.rect(9, 3, 7, 2, "w");
  return tinted(r);
}

function legacySloth(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(32, 32);
  const sag = frame % 2;
  r.ellipse(15, 19, 10, 10, fur.light).ellipse(15, 8 + sag, 7, 6, fur.light);
  light(r, fur);
  r.ellipse(15, 9 + sag, 5, 4, paper.base);
  r.rect(10, 8 + sag, 4, 2, fur.shadow).rect(17, 8 + sag, 4, 2, fur.shadow);
  if (act === "walk") {
    r.set(12, 8 + sag, "k").set(18, 8 + sag, "k").set(12, 9 + sag, "k").set(18, 9 + sag, "k");
  } else {
    eye(r, 12, 9 + sag, moodFor(act, "worried"));
    eye(r, 18, 9 + sag, moodFor(act, "worried"));
  }
  r.rect(13, 12 + sag, 5, 1, "k");
  for (const [x, y] of [[8, 3], [9, 2], [21, 3], [7, 16], [8, 17], [22, 20], [23, 21], [12, 26], [19, 25]] as const) {
    r.set(x, y + (y < 10 ? sag : 0), teal.base);
  }
  r.rect(14, 14 + sag, 3, 1, teal.base).polygon([[14, 15 + sag], [16, 15 + sag], [17, 21], [15, 23], [13, 21]], teal.base);
  light(r, teal);
  r.line(26, 16, 30, 6, fur.base).line(27, 16, 31, 6, fur.base);
  r.rect(28, 2, 4, 3, steel.light).line(28, 5, 31, 5, steel.shadow);
  r.line(4, 16, 1, 25, fur.base).line(5, 16, 2, 25, fur.base);
  r.ellipse(10, 30, 3, 1.5, fur.shadow).ellipse(20, 30, 3, 1.5, fur.shadow);
  r.rect(0, 0, 3, 1, paper.shadow).set(1, 1, paper.shadow).set(1, 2, paper.shadow);
  return tinted(r);
}

function shortcutFerret(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(26, 14);
  const bob = frame % 2;
  r.line(0, 6, 4, 8 + bob, magenta.base).line(0, 7, 4, 9 + bob, magenta.base);
  r.ellipse(11, 8, 8, 3, magenta.base).ellipse(20, 7, 3.5, 2.5, magenta.base).ellipse(18, 4, 1.5, 1.5, magenta.base);
  light(r, magenta);
  r.rect(17, 7, 5, 2, paper.light);
  eye(r, 20, 6, moodFor(act, "worried"));
  r.set(23, 7, "k");
  r.rect(21, 9, 5, 4, steel.light).rect(22, 10, 3, 1, purple.shadow).rect(22, 11, 2, 1, purple.shadow);
  leg(r, 7, 10, 13, stride(frame, 1, 2));
  leg(r, 14, 10, 13, stride(frame, -1, 2));
  r.rect(24, 1 + bob, 1, 2, blue.light);
  return tinted(r);
}

export const AUTOMATION_FACTORY: Readonly<Partial<Record<RegularKind, Pose>>> = {
  grunt: stepAnt,
  runner: synergyBee,
  splitter: branchStick,
  brute: blockerHippo,
  heavy: legacySloth,
  lootRunner: shortcutFerret,
};
