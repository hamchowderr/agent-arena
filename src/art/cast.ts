import type { RegularKind } from "../sim/arena/content";
import { eye, leg, light, lightAll, RAMPS, stride, tinted } from "./form";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

export type Pose = (frame: number) => Sprite;

const { paper, stamp, blue, yellow, green, purple, charcoal, teal, red, steel, wood } = RAMPS;

function spamRoach(frame: number): Sprite {
  const r = new Raster(18, 13);
  [4, 8, 12].forEach((x, i) => {
    const reach = (frame + i) % 2 === 0 ? 1 : -1;
    r.line(x, 9, x + reach, 12, charcoal.shadow);
  });
  r.ellipse(8, 7, 7, 3.5, charcoal.base).ellipse(14.5, 8, 2.5, 2.5, charcoal.base);
  if (frame % 2 === 1) {
    r.polygon([[2, 3], [11, 3], [7, 1]], paper.base);
  }
  r.rect(2, 3, 11, 5, paper.base);
  r.rect(9, 3, 2, 2, stamp.base);
  lightAll(r, charcoal, paper, stamp);
  r.line(2, 3, 6, 5, paper.shadow).line(11, 3, 7, 5, paper.shadow);
  eye(r, 14, 7, "bright");
  r.set(14, 10, "w").set(16, 10, "w");
  const wiggle = frame % 2;
  r.line(16, 6, 17, 1 + wiggle, charcoal.light).line(15, 5, 13, 1 - wiggle + 1, charcoal.light);
  return tinted(r);
}

function clickbaitMoth(frame: number): Sprite {
  const r = new Raster(18, 16);
  const up = frame % 2 === 0;
  const wingY = up ? 4 : 7;
  r.ellipse(5, wingY, 4.5, 3.5, purple.shadow);
  r.line(8, 12, 7, 15, charcoal.base).line(11, 12, 11, 15, charcoal.base);
  r.ellipse(9, 10, 4.5, 2.5, purple.base).ellipse(14, 9, 2.5, 2.5, purple.base);
  r.ellipse(8, wingY - 1, 5, 4, purple.base);
  lightAll(r, purple);
  r.set(8, wingY + 1, red.base).set(9, wingY + 1, red.base).set(8, wingY + 2, red.shadow);
  r.rect(6, wingY - 3, 1, 4, "w").set(7, wingY - 2, "w").set(7, wingY - 1, "w").set(8, wingY - 1, "w");
  r.line(10, 11, 12, 11, purple.shadow);
  eye(r, 14, 9, "shocked");
  r.set(16, 10, "k");
  r.line(15, 6, 17, 2, purple.light).set(16, 3, purple.hi).set(17, 4, purple.hi);
  r.rect(17, 0, 1, 1 + (frame % 2), red.light);
  return tinted(r);
}

function coldEmailCrow(frame: number): Sprite {
  const r = new Raster(24, 22);
  const bob = frame % 2;
  r.polygon([[6, 12], [0, 9], [0, 14], [5, 15]], blue.shadow);
  r.ellipse(10, 13, 7, 5.5, blue.base).ellipse(16, 7 + bob, 4.5, 4.5, blue.base);
  lightAll(r, blue);
  r.line(6, 11, 13, 11, blue.shadow).line(13, 11, 12, 16, blue.shadow).line(7, 13, 11, 13, blue.shadow);
  r.polygon([[20, 6 + bob], [23, 8 + bob], [20, 9 + bob]], yellow.base);
  r.polygon([[12, 4 + bob], [16, 1 + bob], [21, 4 + bob], [15, 4 + bob]], charcoal.base);
  lightAll(r, yellow, charcoal);
  r.set(14, 11, "w").set(18, 11, "w");
  r.polygon([[15, 12], [17, 12], [18, 15], [16, 17], [14, 15]], red.base);
  light(r, red);
  r.rect(15, 11, 3, 1, red.shadow);
  eye(r, 17, 6 + bob, "smug");
  r.rect(20, 9 + bob, 4, 3, paper.light).set(22, 10 + bob, stamp.base);
  leg(r, 8, 18, 21, stride(frame, 1));
  leg(r, 12, 18, 21, stride(frame, -1));
  return tinted(r);
}

function engagementLocust(frame: number): Sprite {
  const r = new Raster(26, 22);
  const crouch = frame === 1 || frame === 3 ? 1 : 0;
  const y = crouch;
  r.line(14, 15 + y, 13, 21, green.shadow).line(18, 15 + y, 19, 21, green.shadow);
  r.ellipse(11, 14 + y, 8, 3.5, green.base).ellipse(20, 12 + y, 3.5, 4, green.base);
  r.polygon([[11, 14 + y], [8, 16 + y], [4, 7 + y * 2], [6, 6 + y * 2]], green.base);
  lightAll(r, green);
  r.line(4, 7 + y * 2, 1, 21, green.shadow).line(5, 8 + y * 2, 2, 21, green.shadow);
  r.line(8, 13 + y, 14, 13 + y, green.shadow);
  r.rect(15, 7 + y, 9, 1, yellow.base).rect(17, 4 + y, 5, 3, yellow.base);
  light(r, yellow);
  r.rect(17, 6 + y, 5, 1, red.base);
  eye(r, 20, 10 + y, "fake");
  r.rect(20, 14 + y, 4, 2, "k").set(21, 14 + y, "w").set(23, 14 + y, "w");
  const sway = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  r.line(24 + sway, 3, 24, 21, wood.base);
  light(r, wood);
  r.rect(23 + sway, 1, 3, 1, steel.base).set(23 + sway, 0, steel.light).set(25 + sway, 0, steel.light);
  r.line(19, 16 + y, 23, 15, green.light);
  return tinted(r);
}

function thoughtLeaderToad(frame: number): Sprite {
  const r = new Raster(36, 33);
  const puff = frame % 2;
  r.ellipse(17, 30, 17, 2.5, red.base);
  light(r, red);
  r.ellipse(16, 22, 13, 8.5 + puff * 0.5, yellow.base).ellipse(17, 14, 10, 6, yellow.base);
  r.ellipse(11, 9, 3, 3, yellow.base).ellipse(22, 9, 3, 3, yellow.base);
  light(r, yellow);
  r.ellipse(17, 25, 8, 4.5, yellow.hi);
  r.ring(11, 9, 3, 3, 1, "k").ring(22, 9, 3, 3, 1, "k").line(14, 9, 19, 9, "k");
  eye(r, 11, 9, "smug");
  eye(r, 22, 9, "smug");
  r.line(9, 15, 23, 15, "k").set(24, 14, "k").set(8, 14, "k");
  r.line(28, 8, 29, 12, steel.shadow).line(29, 12, 25, 16, steel.shadow).rect(24, 16, 2, 1, charcoal.base);
  const wag = frame === 2 ? 2 : frame === 0 ? 0 : 1;
  r.line(27, 22, 31 - wag, 13, yellow.shadow).line(28, 22, 32 - wag, 13, yellow.shadow);
  r.rect(31 - wag, 10, 2, 3, yellow.light);
  r.ellipse(7, 30, 3, 1.5, yellow.shadow).ellipse(25, 30, 3, 1.5, yellow.shadow);
  r.set(2, 2, yellow.hi).set(1, 3, yellow.light).set(3, 3, yellow.light).set(2, 4, yellow.light);
  return tinted(r);
}

function freeLeadMouse(frame: number): Sprite {
  const r = new Raster(22, 16);
  const bob = frame % 2;
  const y = bob;
  r.line(0, 5, 4, 9 + y, steel.shadow);
  r.ellipse(9, 10 + y, 6, 3.5, steel.base).ellipse(15, 9 + y, 3.5, 3, steel.base).ellipse(13, 5 + y, 2, 2, steel.base);
  light(r, steel);
  r.set(13, 5 + y, stamp.light).set(19, 8 + y, stamp.base);
  eye(r, 15, 8 + y, "worried");
  r.rect(17, 10 + y, 5, 3, teal.base);
  light(r, teal);
  r.rect(18, 11 + y, 3, 1, "w");
  leg(r, 6, 13 + y, 15, stride(frame, 1, 2));
  leg(r, 12, 13 + y, 15, stride(frame, -1, 2));
  r.rect(20, 1 + bob, 1, 2, blue.light).set(20, 3 + bob, blue.hi);
  return tinted(r);
}

export const PROMPT_PLAINS: Readonly<Partial<Record<RegularKind, Pose>>> = {
  grunt: spamRoach,
  runner: clickbaitMoth,
  shooter: coldEmailCrow,
  splitter: engagementLocust,
  heavy: thoughtLeaderToad,
  lootRunner: freeLeadMouse,
};
