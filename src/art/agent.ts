import type { Tier } from "../sim/tiers";
import { outlined } from "./arena-sprites";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

function eyes(r: Raster, x: number, y: number, gap: number): void {
  r.rect(x, y, 2, 2, "w").rect(x + gap, y, 2, 2, "w");
  r.set(x + 1, y + 1, "k").set(x + gap + 1, y + 1, "k");
}

function legs(r: Raster, x: number, y: number, gap: number, height: number): void {
  r.rect(x, y, 2, height, "D").rect(x + gap, y, 2, height, "D");
}

function rawLlm(): Sprite {
  const r = new Raster(12, 12);
  r.ellipse(5.5, 6, 5.2, 5, "P");
  r.ellipse(4, 4, 1.5, 1.2, "m");
  eyes(r, 3, 6, 4);
  r.set(10, 1, "y").set(11, 0, "w");
  return outlined(r.sprite(), "k");
}

function chatbot(): Sprite {
  const r = new Raster(15, 16);
  r.rect(1, 1, 13, 9, "Q");
  r.rect(0, 2, 15, 7, "Q");
  r.polygon([[3, 10], [7, 10], [2, 13]], "Q");
  r.rect(3, 3, 9, 5, "P");
  eyes(r, 4, 4, 5);
  legs(r, 4, 12, 6, 3);
  return outlined(r.sprite(), "k");
}

function toolUser(): Sprite {
  const r = new Raster(19, 18);
  r.ellipse(8, 7, 7, 6.5, "Q");
  r.rect(3, 4, 11, 6, "P");
  eyes(r, 5, 5, 5);
  r.rect(4, 12, 9, 2, "Q");
  r.line(15, 9, 17, 6, "0").line(16, 9, 18, 6, "0");
  r.rect(16, 3, 3, 3, "C");
  r.set(17, 3, ".");
  r.rect(0, 8, 2, 3, "0");
  legs(r, 5, 14, 5, 4);
  return outlined(r.sprite(), "k");
}

function agent(): Sprite {
  const r = new Raster(22, 22);
  r.rect(0, 9, 4, 8, "B");
  r.set(1, 11, "l").set(1, 14, "c");
  r.line(10, 0, 10, 4, "0");
  r.ellipse(10, 0.5, 1.5, 1.5, "y");
  r.ellipse(11, 10, 8, 7, "Q");
  r.rect(5, 7, 13, 6, "P");
  eyes(r, 7, 8, 6);
  r.rect(5, 15, 12, 2, "3");
  r.polygon([[5, 15], [8, 15], [3, 19]], "3");
  r.line(18, 12, 20, 9, "0").line(19, 12, 21, 9, "0");
  r.rect(19, 6, 3, 3, "C");
  legs(r, 7, 17, 6, 5);
  return outlined(r.sprite(), "k");
}

function harnessed(): Sprite {
  const r = new Raster(26, 27);
  r.ring(13, 1.5, 6, 1.5, 1, "y");
  r.rect(1, 11, 4, 9, "B");
  r.set(2, 13, "l").set(2, 16, "c").set(3, 18, "l");
  r.ellipse(13, 13, 9, 8, "Q");
  r.rect(7, 9, 13, 6, "P");
  r.rect(8, 11, 11, 1, "m");
  eyes(r, 9, 10, 7);
  r.ellipse(5, 10, 3, 2.5, "C");
  r.ellipse(21, 10, 3, 2.5, "C");
  r.line(7, 16, 19, 20, "D").line(19, 16, 7, 20, "D");
  r.ellipse(13, 18, 2, 2, "y");
  r.line(22, 15, 24, 11, "0").line(23, 15, 25, 11, "0");
  r.rect(23, 7, 3, 4, "C");
  legs(r, 8, 21, 8, 4);
  r.rect(7, 25, 4, 1, "o").rect(15, 25, 4, 1, "o");
  return outlined(r.sprite(), "k");
}

const DRAW: Readonly<Record<Tier, () => Sprite>> = {
  1: rawLlm,
  2: chatbot,
  3: toolUser,
  4: agent,
  5: harnessed,
};

export function agentBody(tier: Tier): Sprite {
  return DRAW[tier]();
}
