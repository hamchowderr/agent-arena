import type { RegularKind, WorldId } from "../sim/arena/content";
import { ENEMY_SPRITES, outlined } from "./arena-sprites";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

function eye(r: Raster, x: number, y: number): void {
  r.set(x, y - 1, "k").set(x + 1, y - 1, "k").set(x, y, "w").set(x + 1, y, "k");
}

function legs(r: Raster, xs: readonly number[], top: number, height: number, width = 1): void {
  for (const x of xs) {
    r.rect(x, top, width, height, "D");
  }
}

function frame(r: Raster, x: number, y: number, width: number, height: number): void {
  r.rect(x, y, width, 1, "k").rect(x, y + height - 1, width, 1, "k").rect(x, y, 1, height, "k").rect(x + width - 1, y, 1, height, "k");
}

function clear(r: Raster, where: (x: number, y: number) => boolean): void {
  for (let y = 0; y < r.height; y += 1) {
    for (let x = 0; x < r.width; x += 1) {
      if (where(x, y)) {
        r.set(x, y, ".");
      }
    }
  }
}

function done(r: Raster): Sprite {
  return outlined(r.sprite(), "k");
}

function stickyNote(): Sprite {
  const r = new Raster(13, 14);
  r.rect(0, 0, 13, 11, "1");
  r.rect(0, 0, 13, 2, "8");
  clear(r, (x, y) => x >= 9 && y >= 7 && y <= 10 && x - 9 + (y - 7) > 3);
  r.polygon([[9, 7], [13, 7], [9, 11]], "A");
  r.line(9, 11, 13, 7, "k");
  eye(r, 3, 5);
  eye(r, 8, 5);
  r.rect(4, 8, 4, 1, "k").set(5, 9, "3").set(6, 9, "3");
  legs(r, [3, 8], 11, 3);
  return done(r);
}

function duplicatePage(): Sprite {
  const r = new Raster(20, 19);
  r.rect(0, 0, 14, 15, "0");
  r.rect(1, 1, 11, 1, "A").rect(1, 3, 9, 1, "A");
  r.rect(3, 2, 17, 15, "k").rect(4, 3, 15, 13, "A");
  clear(r, (x, y) => x >= 16 && y >= 2 && y <= 5 && x - 16 > y - 2);
  r.polygon([[16, 2], [16, 6], [20, 6]], "Q");
  r.line(16, 2, 19, 5, "k").line(16, 2, 16, 5, "k").line(16, 5, 19, 5, "k");
  eye(r, 6, 7);
  eye(r, 13, 7);
  for (let y = 4; y < 16; y += 2) {
    r.set(11, y, "k");
  }
  r.rect(5, 9, 13, 5, "7").rect(6, 10, 11, 3, "A");
  for (let x = 7; x < 16; x += 2) {
    r.set(x, 11, "7");
  }
  legs(r, [7, 15], 17, 2);
  return done(r);
}

function contextLeech(): Sprite {
  const r = new Raster(18, 9);
  r.ellipse(2.5, 5.5, 2.5, 2.5, "2");
  r.ellipse(6.5, 5, 3, 3.2, "2");
  r.ellipse(12, 4, 4, 4.2, "2");
  r.rect(4, 3, 1, 5, "8").rect(8, 2, 1, 6, "8");
  r.rect(10, 2, 2, 2, "w").rect(13, 2, 2, 2, "w").set(12, 2, "k").set(11, 3, "k").set(14, 3, "k");
  r.rect(15, 5, 2, 2, "0").rect(17, 4, 1, 4, "0").set(16, 5, "D");
  return done(r);
}

function wikiGolem(): Sprite {
  const r = new Raster(30, 25);
  r.rect(8, 0, 14, 4, "4").rect(8, 0, 2, 4, "A").rect(18, 0, 1, 4, "C");
  r.rect(6, 4, 18, 6, "4").rect(6, 4, 18, 1, "A");
  r.rect(5, 10, 20, 6, "4").rect(5, 12, 20, 1, "C");
  r.rect(7, 16, 16, 4, "4").rect(7, 19, 16, 1, "A");
  r.rect(6, 4, 18, 1, "k").rect(5, 10, 20, 1, "k").rect(7, 16, 16, 1, "k");
  r.rect(0, 8, 4, 11, "4").rect(26, 8, 4, 11, "4");
  r.rect(0, 8, 1, 11, "A").rect(29, 8, 1, 11, "A");
  r.rect(0, 13, 4, 1, "C").rect(26, 13, 4, 1, "C");
  r.rect(4, 11, 1, 2, "k").rect(25, 11, 1, 2, "k");
  eye(r, 10, 7);
  eye(r, 19, 7);
  r.line(12, 9, 18, 9, "k");
  r.rect(9, 20, 4, 5, "4").rect(17, 20, 4, 5, "4").rect(9, 22, 4, 1, "C").rect(17, 22, 4, 1, "C");
  return done(r);
}

function lockedArchive(): Sprite {
  const r = new Raster(26, 30);
  r.rect(0, 0, 26, 28, "P");
  for (const top of [2, 10, 18]) {
    frame(r, 3, top, 20, 7);
    r.rect(10, top + 1, 6, 2, "A").rect(11, top + 4, 4, 1, "A");
  }
  eye(r, 5, 4);
  eye(r, 18, 4);
  for (let x = 0; x < 26; x += 1) {
    r.set(x, 13, x % 3 === 0 ? "k" : "0").set(x, 14, x % 3 === 1 ? "k" : "0");
    r.set(x, 23, x % 3 === 0 ? "k" : "0").set(x, 24, x % 3 === 1 ? "k" : "0");
  }
  r.ring(13, 11, 2.6, 2.6, 1, "0");
  r.rect(10, 12, 7, 6, "C").set(13, 14, "k").set(13, 15, "k");
  legs(r, [2, 21], 28, 2, 3);
  return done(r);
}

function exportButton(): Sprite {
  const r = new Raster(18, 13);
  r.rect(1, 0, 16, 9, "6").rect(0, 1, 18, 7, "6");
  r.rect(1, 9, 16, 1, "D");
  r.rect(4, 1, 2, 3, "Q").polygon([[2, 4], [8, 4], [5, 7]], "Q").rect(2, 7, 6, 1, "Q");
  eye(r, 11, 3);
  eye(r, 15, 3);
  r.rect(12, 6, 4, 1, "k");
  legs(r, [5, 12], 10, 3);
  return done(r);
}

function invoice(): Sprite {
  const r = new Raster(12, 16);
  r.rect(0, 0, 12, 12, "1");
  for (let x = 0; x < 12; x += 2) {
    r.set(x, 12, "1");
  }
  r.rect(1, 1, 10, 1, "D");
  eye(r, 2, 4);
  eye(r, 7, 4);
  r.rect(5, 6, 1, 6, "2").rect(4, 7, 3, 1, "2").set(4, 8, "2").rect(4, 9, 3, 1, "2").set(6, 10, "2").rect(4, 11, 3, 1, "2");
  legs(r, [3, 8], 13, 3);
  return done(r);
}

function rateLimiter(): Sprite {
  const r = new Raster(22, 17);
  r.rect(8, 0, 7, 6, "3").rect(8, 0, 7, 1, "A");
  eye(r, 10, 3);
  eye(r, 13, 3);
  r.rect(0, 6, 22, 2, "0").rect(0, 6, 2, 2, "3").rect(20, 6, 2, 2, "3");
  r.ellipse(11, 7, 2, 2, "D");
  r.rect(9, 9, 5, 3, "3");
  r.rect(3, 12, 16, 2, "D");
  r.ellipse(6, 15, 2, 2, "0").ellipse(16, 15, 2, 2, "0").set(6, 15, "k").set(16, 15, "k");
  return done(r);
}

function timeout(): Sprite {
  const r = new Raster(18, 23);
  r.ellipse(8.5, 14, 8.5, 8.5, "P");
  r.ellipse(8.5, 14, 6.5, 6.5, "Q");
  r.rect(7, 3, 3, 3, "0");
  r.line(9, 3, 12, 0, "D");
  r.set(13, 0, "y").set(14, 1, "o").set(13, 1, "w").set(14, 0, "o");
  r.set(8, 8, "3").set(8, 9, "3");
  eye(r, 5, 13);
  eye(r, 10, 13);
  r.rect(6, 17, 5, 1, "k");
  return done(r);
}

function quotaCutter(): Sprite {
  const r = new Raster(30, 21);
  r.ring(6, 6, 5, 4.5, 2, "9");
  r.ring(6, 15, 5, 4.5, 2, "9");
  r.polygon([[10, 6], [30, 9], [12, 11]], "0");
  r.polygon([[10, 15], [30, 12], [12, 10]], "A");
  r.line(13, 10, 29, 10, "k");
  r.ellipse(12, 10.5, 2.5, 2.5, "D").set(12, 10, "k");
  r.rect(15, 5, 7, 2, "C").line(20, 6, 23, 7, "C");
  eye(r, 16, 9);
  eye(r, 20, 9);
  return done(r);
}

function tollBooth(): Sprite {
  const r = new Raster(32, 30);
  r.rect(0, 0, 22, 3, "D");
  r.rect(1, 3, 20, 24, "4");
  r.rect(4, 6, 14, 8, "Q");
  frame(r, 3, 5, 16, 10);
  eye(r, 7, 10);
  eye(r, 13, 10);
  r.rect(7, 17, 8, 4, "C").rect(9, 18, 4, 1, "k").rect(9, 19, 4, 1, "D");
  r.rect(21, 10, 2, 7, "D");
  for (let x = 23; x < 32; x += 1) {
    r.rect(x, 12, 1, 2, Math.floor((x - 23) / 2) % 2 === 0 ? "3" : "A");
  }
  legs(r, [3, 15], 27, 3, 4);
  return done(r);
}

function refund(): Sprite {
  const r = new Raster(16, 15);
  r.rect(0, 0, 16, 10, "2");
  for (let x = 0; x < 16; x += 2) {
    r.set(x, 10, "2");
  }
  r.rect(1, 1, 14, 1, "D");
  r.line(3, 5, 7, 5, "Q").line(3, 5, 5, 3, "Q").line(3, 5, 5, 7, "Q").line(7, 5, 7, 7, "Q");
  eye(r, 10, 5);
  eye(r, 13, 5);
  r.rect(11, 7, 3, 1, "k");
  legs(r, [4, 11], 11, 4);
  return done(r);
}

function step(): Sprite {
  const r = new Raster(13, 15);
  r.rect(0, 0, 13, 11, "1");
  r.rect(0, 0, 13, 2, "C");
  eye(r, 3, 4);
  eye(r, 8, 4);
  r.rect(4, 6, 5, 4, "A").rect(6, 6, 1, 4, "k").set(5, 7, "k");
  legs(r, [3, 9], 11, 4);
  return done(r);
}

function synergySwarm(): Sprite {
  const r = new Raster(18, 9);
  r.rect(3, 3, 10, 3, "P");
  r.polygon([[11, 0], [18, 4.5], [11, 9]], "P");
  r.polygon([[0, 0], [4, 3], [4, 6], [0, 9], [2, 4.5]], "A");
  eye(r, 13, 4);
  r.rect(5, 4, 5, 1, "5");
  return done(r);
}

function branch(): Sprite {
  const r = new Raster(20, 22);
  r.rect(7, 9, 6, 10, "2");
  r.polygon([[7, 10], [9, 10], [4, 2], [2, 3]], "2");
  r.polygon([[11, 10], [13, 10], [18, 3], [16, 2]], "2");
  r.ellipse(3, 2.5, 3, 2.5, "8").ellipse(17, 2.5, 3, 2.5, "8");
  r.line(10, 9, 10, 18, "k");
  eye(r, 7, 12);
  eye(r, 11, 12);
  legs(r, [7, 12], 19, 3);
  return done(r);
}

function blocker(): Sprite {
  const r = new Raster(28, 30);
  const sign: [number, number][] = [[7, 0], [17, 0], [22, 5], [22, 15], [17, 20], [7, 20], [2, 15], [2, 5]];
  r.polygon(sign, "3");
  r.rect(4, 8, 17, 5, "Q");
  for (const x of [5, 9, 13, 17]) {
    r.rect(x, 9, 3, 3, "k");
  }
  r.set(6, 10, "Q").set(14, 10, "Q").set(18, 10, "Q");
  eye(r, 8, 5);
  eye(r, 15, 5);
  r.line(8, 16, 15, 16, "k");
  r.rect(10, 20, 5, 6, "0");
  r.rect(15, 15, 8, 2, "0");
  r.rect(22, 4, 5, 22, "0").rect(23, 5, 1, 20, "Q").rect(22, 4, 5, 1, "D").rect(22, 25, 5, 1, "D");
  legs(r, [9, 14], 26, 4, 2);
  return done(r);
}

function legacyWorkflow(): Sprite {
  const r = new Raster(34, 27);
  r.rect(0, 0, 34, 20, "4");
  r.rect(2, 2, 30, 16, "0");
  r.rect(4, 4, 7, 4, "A").rect(23, 4, 7, 4, "A");
  r.polygon([[17, 3], [21, 6], [17, 9], [13, 6]], "4");
  r.line(11, 6, 13, 6, "k").line(21, 6, 23, 6, "k").line(17, 9, 17, 11, "k");
  eye(r, 8, 13);
  eye(r, 24, 13);
  r.rect(12, 14, 10, 2, "k").rect(13, 14, 2, 1, "w").rect(19, 14, 2, 1, "w");
  for (const x of [5, 16, 27]) {
    r.rect(x, 20, 2, 4, "4");
    r.polygon([[x - 2, 23], [x + 4, 23], [x + 1, 27]], "4");
  }
  return done(r);
}

function shortcut(): Sprite {
  const r = new Raster(18, 15);
  r.polygon([[0, 0], [13, 0], [18, 4.5], [13, 9], [0, 9]], "9");
  r.line(9, 2, 12, 4, "Q").line(12, 4, 9, 6, "Q").line(5, 2, 8, 4, "Q").line(8, 4, 5, 6, "Q");
  eye(r, 2, 4);
  legs(r, [4, 11], 9, 6);
  return done(r);
}

function hallucination(): Sprite {
  const r = new Raster(15, 16);
  r.ellipse(7, 6, 7, 6, "9");
  clear(r, (_, y) => y > 7);
  r.rect(0, 7, 15, 1, "7");
  r.set(3, 2, "Q").set(4, 1, "Q").set(10, 3, "Q");
  eye(r, 4, 5);
  eye(r, 9, 5);
  for (const x of [2, 5, 9, 12]) {
    for (let y = 8; y < 16; y += 1) {
      r.set(x + (Math.floor(y / 2) % 2), y, "p");
    }
  }
  return done(r);
}

function chunk(): Sprite {
  const r = new Raster(20, 20);
  r.rect(0, 4, 15, 14, "P");
  r.polygon([[0, 4], [4, 0], [20, 0], [15, 4]], "m");
  r.polygon([[15, 4], [20, 0], [20, 14], [15, 18]], "5");
  for (const [y, width] of [[11, 11], [13, 8], [15, 10]] as const) {
    r.rect(2, y, width, 1, "Q");
  }
  eye(r, 3, 8);
  eye(r, 10, 8);
  for (let y = 4; y < 18; y += 1) {
    r.set(7 + (y % 3 === 0 ? 1 : 0), y, "k");
  }
  legs(r, [3, 11], 18, 2);
  return done(r);
}

function confidentAnswer(): Sprite {
  const r = new Raster(26, 20);
  r.ellipse(11, 12, 10, 7.5, "4");
  r.polygon([[3, 12], [0, 6], [0, 18]], "4");
  r.polygon([[13, 12], [22, 7], [22, 17]], "k");
  for (let x = 15; x < 22; x += 2) {
    r.set(x, 9 + Math.floor((x - 15) / 3), "w").set(x, 15 - Math.floor((x - 15) / 3), "w");
  }
  r.ellipse(12, 7, 2, 2, "w").set(13, 7, "k");
  r.line(10, 4, 15, 1, "D").line(15, 1, 19, 1, "D");
  r.ellipse(22, 2, 3.2, 2.2, "8");
  r.set(20, 2, "w").set(21, 3, "w").set(22, 2, "w").set(23, 1, "w");
  r.polygon([[8, 18], [12, 18], [9, 20]], "4");
  return done(r);
}

function deepIndex(): Sprite {
  const r = new Raster(26, 30);
  r.rect(0, 0, 26, 28, "2");
  for (const top of [2, 10, 18]) {
    frame(r, 3, top, 20, 7);
    r.rect(10, top + 4, 6, 1, "A");
  }
  eye(r, 7, 5);
  eye(r, 16, 5);
  for (const [x, y] of [[1, 9], [22, 3], [24, 16], [6, 15], [18, 24], [2, 23], [13, 1]] as const) {
    r.ellipse(x, y, 1.6, 1.4, "A").set(x, y, "k");
  }
  legs(r, [2, 21], 28, 2, 3);
  return done(r);
}

function abyssalCitation(): Sprite {
  const r = new Raster(36, 28);
  r.ellipse(18, 10, 17, 10, "3");
  clear(r, (_, y) => y > 10);
  r.ellipse(18, 15, 15, 5, "p");
  r.ellipse(18, 21, 17.5, 6.5, "3");
  clear(r, (x, y) => y < 17 && r.get(x, y) === "3" && y > 10);
  for (const x of [6, 12, 24, 30]) {
    r.line(18, 1, x, 10, "D");
  }
  for (const x of [8, 14, 22, 28]) {
    r.line(18, 27, x, 18, "D");
  }
  r.ellipse(18, 14, 5, 5, "Q");
  r.set(15, 11, "w").set(16, 11, "w").set(15, 12, "w");
  r.rect(15, 12, 1, 5, "k").rect(21, 12, 1, 5, "k").set(16, 12, "k").set(16, 16, "k").set(20, 12, "k").set(20, 16, "k");
  r.rect(18, 13, 1, 3, "k").set(17, 13, "k");
  eye(r, 9, 6);
  eye(r, 25, 6);
  return done(r);
}

function realSource(): Sprite {
  const r = new Raster(18, 13);
  r.rect(0, 0, 18, 9, "1");
  r.rect(0, 0, 18, 2, "D");
  r.rect(2, 4, 7, 1, "k").rect(2, 6, 5, 1, "k");
  r.line(11, 5, 12, 6, "2").line(12, 6, 15, 3, "2");
  eye(r, 11, 3);
  eye(r, 15, 3);
  legs(r, [4, 13], 9, 4);
  return done(r);
}

type WorldSprites = Readonly<Partial<Record<RegularKind, Sprite>>>;

export const WORLD_ENEMY_SPRITES: Readonly<Record<WorldId, WorldSprites>> = {
  hustlr: ENEMY_SPRITES,
  notionally: { grunt: stickyNote(), splitter: duplicatePage(), runner: contextLeech(), brute: wikiGolem(), heavy: lockedArchive(), lootRunner: exportButton() },
  meterly: { grunt: invoice(), charger: rateLimiter(), exploder: timeout(), brute: quotaCutter(), heavy: tollBooth(), lootRunner: refund() },
  synergex: { grunt: step(), runner: synergySwarm(), splitter: branch(), brute: blocker(), heavy: legacyWorkflow(), lootRunner: shortcut() },
  trustMe: { grunt: hallucination(), splitter: chunk(), shooter: confidentAnswer(), brute: deepIndex(), heavy: abyssalCitation(), lootRunner: realSource() },
};

export function enemySprite(world: WorldId, kind: RegularKind): Sprite {
  return WORLD_ENEMY_SPRITES[world][kind] ?? ENEMY_SPRITES[kind];
}
