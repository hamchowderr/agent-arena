import type { Tier } from "../sim/tiers";
import { light, RAMPS, tinted, type Ramp } from "./form";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

const { paper, teal, yellow, steel, blue, charcoal } = RAMPS;

function screenFace(r: Raster, x: number, y: number, width: number, height: number, frame: number): void {
  r.rect(x, y, width, height, teal.base);
  light(r, teal);
  const eyeY = y + Math.floor(height / 2) - 1;
  const gap = Math.max(3, Math.floor(width / 2) - 1);
  const left = x + Math.floor((width - gap - 2) / 2);
  const blink = frame === 3;
  for (const at of [left, left + gap]) {
    r.rect(at, blink ? eyeY + 1 : eyeY, 2, blink ? 1 : 2, "w");
  }
  if (height >= 5) {
    r.rect(left + 1, eyeY + 3, gap, 1, teal.hi);
  }
}

function foot(r: Raster, x: number, top: number, bottom: number, step: number, boot: Ramp): void {
  r.rect(x, top, 2, bottom - top, charcoal.base);
  r.rect(x - 1 + step, bottom, 4, 2, boot.base);
}

function rawLlm(frame: number): Sprite {
  const r = new Raster(16, 17);
  const bob = frame % 2;
  r.ellipse(7.5, 8 + bob, 6.5, 6.5, teal.base);
  light(r, teal);
  r.ellipse(6, 6 + bob, 2.5, 2, teal.hi);
  r.rect(4, 8 + bob, 2, 2, "w").rect(9, 8 + bob, 2, 2, "w");
  r.rect(6, 12 + bob, 3, 1, teal.shadow);
  r.set(14, 1 + bob, yellow.hi).set(13, 2 + bob, yellow.light).set(15, 2 + bob, yellow.light).set(14, 3 + bob, yellow.light);
  r.set(1, 14 - bob, teal.light).set(2, 15 - bob, teal.light);
  return tinted(r);
}

function chatbot(frame: number): Sprite {
  const r = new Raster(18, 21);
  const bob = frame % 2;
  foot(r, 5, 14, 18, frame === 0 ? 2 : frame === 2 ? -2 : 0, steel);
  foot(r, 10, 14, 18, frame === 0 ? -2 : frame === 2 ? 2 : 0, steel);
  light(r, steel);
  r.rect(1, 1 + bob, 16, 11, paper.base).polygon([[3, 11 + bob], [8, 11 + bob], [2, 15 + bob]], paper.base);
  light(r, paper);
  screenFace(r, 3, 3 + bob, 12, 7, frame);
  r.rect(13, 0 + bob, 3, 1, yellow.base);
  return tinted(r);
}

function toolUser(frame: number): Sprite {
  const r = new Raster(23, 24);
  const bob = frame % 2;
  foot(r, 7, 17, 21, frame === 0 ? 2 : frame === 2 ? -2 : 0, steel);
  foot(r, 12, 17, 21, frame === 0 ? -2 : frame === 2 ? 2 : 0, steel);
  light(r, steel);
  r.rect(5, 11 + bob, 11, 7, paper.base);
  light(r, paper);
  r.rect(5, 16 + bob, 11, 1, yellow.base).set(10, 16 + bob, yellow.hi);
  r.rect(3, 0 + bob, 15, 11, paper.base);
  light(r, paper);
  screenFace(r, 5, 2 + bob, 11, 7, frame);
  const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  r.line(16, 13 + bob, 19, 10 + swing, steel.base).line(19, 10 + swing, 19, 4 + swing, steel.base);
  r.rect(18, 2 + swing, 4, 2, steel.base).set(19, 3 + swing, steel.shadow);
  r.line(4, 13 + bob, 2, 17 + bob, steel.base);
  return tinted(r);
}

function agent(frame: number): Sprite {
  const r = new Raster(27, 28);
  const bob = frame % 2;
  foot(r, 8, 20, 25, frame === 0 ? 2 : frame === 2 ? -2 : 0, blue);
  foot(r, 15, 20, 25, frame === 0 ? -2 : frame === 2 ? 2 : 0, blue);
  light(r, blue);
  r.rect(1, 12 + bob, 5, 8, blue.base);
  light(r, blue);
  r.set(2, 14 + bob, (frame & 1) === 0 ? yellow.hi : teal.light).set(2, 17 + bob, teal.light);
  r.rect(6, 13 + bob, 13, 8, paper.base);
  light(r, paper);
  r.rect(6, 19 + bob, 13, 1, yellow.base).rect(11, 19 + bob, 3, 2, yellow.base);
  r.line(12, 0 + bob, 12, 3 + bob, steel.base).rect(11, 0 + bob, 3, 1, yellow.hi);
  r.rect(4, 3 + bob, 17, 11, paper.base);
  light(r, paper);
  screenFace(r, 6, 5 + bob, 13, 7, frame);
  const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  r.line(19, 15 + bob, 23, 12 + swing, steel.base).line(23, 12 + swing, 23, 6 + swing, steel.base);
  r.rect(22, 3 + swing, 5, 3, steel.base).set(24, 4 + swing, steel.shadow);
  return tinted(r);
}

function harnessed(frame: number): Sprite {
  const r = new Raster(31, 32);
  const bob = frame % 2;
  const flame = frame % 2 === 0 ? 2 : 1;
  foot(r, 9, 23, 28, frame === 0 ? 2 : frame === 2 ? -2 : 0, yellow);
  foot(r, 18, 23, 28, frame === 0 ? -2 : frame === 2 ? 2 : 0, yellow);
  light(r, yellow);
  r.rect(1, 13 + bob, 6, 10, blue.base);
  light(r, blue);
  r.rect(2, 23 + bob, 4, flame, teal.light).set(3, 23 + bob + flame, teal.hi);
  r.rect(7, 14 + bob, 16, 10, paper.base);
  light(r, paper);
  r.ellipse(6, 14 + bob, 3, 2.5, yellow.base).ellipse(24, 14 + bob, 3, 2.5, yellow.base);
  light(r, yellow);
  r.line(8, 15 + bob, 22, 23 + bob, yellow.shadow).line(22, 15 + bob, 8, 23 + bob, yellow.shadow);
  r.ellipse(15, 19 + bob, 2.5, 2.5, teal.light).set(15, 18 + bob, teal.hi);
  r.ring(15, 1.5 + bob, 6, 1.5, 1, yellow.light);
  r.rect(5, 3 + bob, 21, 12, paper.base);
  light(r, paper);
  screenFace(r, 7, 5 + bob, 17, 8, frame);
  const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  r.line(24, 17 + bob, 27, 13 + swing, steel.base).line(27, 13 + swing, 27, 7 + swing, steel.base);
  r.rect(26, 4 + swing, 5, 3, steel.base);
  return tinted(r);
}

const DRAW: Readonly<Record<Tier, (frame: number) => Sprite>> = {
  1: rawLlm,
  2: chatbot,
  3: toolUser,
  4: agent,
  5: harnessed,
};

export function agentPose(tier: Tier, frame: number): Sprite {
  return DRAW[tier](frame);
}

export function agentBody(tier: Tier): Sprite {
  return DRAW[tier](0);
}
