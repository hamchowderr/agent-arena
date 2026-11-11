import type { RegularKind } from "../sim/arena/content";
import type { Pose } from "./cast";
import { type Act, moodFor, eye, leg, light, lightAll, RAMPS, stride, tinted } from "./form";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

const { paper, blue, yellow, green, olive, magenta, teal, steel, wood, coral } = RAMPS;

function stickySnail(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(18, 14);
  const reach = frame % 2;
  r.ellipse(9, 11, 8, 2.5, olive.base).ellipse(15 + reach, 8, 2.5, 3.5, olive.base);
  r.line(14 + reach, 5, 13 + reach, 2, olive.base).line(17 + reach, 5, 17 + reach, 2, olive.base);
  light(r, olive);
  const lift = frame === 1 || frame === 2 ? 1 : 0;
  r.rect(3, 2 - lift, 9, 8, yellow.base);
  light(r, yellow);
  r.polygon([[9, 2 - lift], [11, 2 - lift], [11, 4 - lift]], yellow.shadow).set(10, 2 - lift, ".").set(11, 2 - lift, ".");
  r.rect(5, 5 - lift, 5, 1, yellow.shadow).rect(5, 7 - lift, 4, 1, yellow.shadow);
  for (const x of [12, 16]) {
    if (act === "walk") {
      r.rect(x + reach, 1, 2, 2, "k").set(x + reach, 1, "w");
    } else {
      eye(r, x + reach, 2, moodFor(act, "eager"));
    }
  }
  r.set(16 + reach, 10, "k").set(17 + reach, 9, "k");
  r.set(0, 13, olive.light).set(2, 13, olive.light);
  return tinted(r);
}

function duplicateRabbit(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(22, 20);
  const hop = frame === 1 || frame === 3 ? 1 : 0;
  const y = -hop;
  r.polygon([[16, 6 + y], [18, 6 + y], [20, 1 + y], [18, 1 + y]], paper.shadow);
  r.ellipse(9, 13 + y, 7, 5, paper.base).ellipse(16, 9 + y, 4, 3.5, paper.base).ellipse(2, 11 + y, 1.5, 1.5, paper.base);
  r.polygon([[14, 6 + y], [16, 6 + y], [17, 0 + y], [14, 1 + y]], paper.base);
  light(r, paper);
  r.polygon([[16, 0 + y], [17, 0 + y], [17, 2 + y]], paper.shadow);
  r.rect(5, 11 + y, 6, 1, blue.base).rect(5, 13 + y, 5, 1, blue.base).rect(5, 15 + y, 6, 1, blue.base).rect(12, 12 + y, 2, 2, blue.shadow);
  eye(r, 17, 8 + y, moodFor(act, frame === 3 ? "smug" : "eager"));
  r.set(20, 10 + y, "k").set(18, 1 + y, blue.light).set(13, 13 + y, blue.light);
  r.ellipse(6, 18, 2.5, 1.5, paper.shadow).rect(14, 17 + y, 2, 2, paper.light);
  return tinted(r);
}

function contextLeech(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(18, 12);
  const waves = [0, 1, 1, 0, -1, -1];
  for (let i = 0; i < 5; i += 1) {
    r.ellipse(2 + i * 3, 7 + (waves[(i + frame) % waves.length] ?? 0), 2.5, 2.5, magenta.base);
  }
  r.ellipse(15, 6, 2.5, 2.5, magenta.base);
  light(r, magenta);
  for (let i = 1; i < 5; i += 2) {
    r.rect(2 + i * 3, 6 + (waves[(i + frame) % waves.length] ?? 0), 1, 3, magenta.shadow);
  }
  r.set(17, 5, "k").set(17, 6, "r").set(17, 7, "k");
  eye(r, 14, 5, moodFor(act, "angry"));
  r.rect(4, 1, 3, 1, paper.light).rect(4, 2, 6, 3, paper.light).rect(5, 3, 4, 1, steel.shadow);
  return tinted(r);
}

function wikiTortoise(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(32, 24);
  r.rect(23, 12, 5, 4, green.base).ellipse(28, 12, 3.5, 3, green.base);
  r.ellipse(15, 15, 12, 9, olive.base).rect(0, 19, 32, 5, ".");
  [7, 13, 19, 24].forEach((x, i) => r.rect(x, 18 + (stride(frame, i % 2 ? 1 : -1) > 0 ? 1 : 0), 3, 5 - (stride(frame, i % 2 ? 1 : -1) > 0 ? 1 : 0), green.base));
  lightAll(r, green, olive);
  r.rect(5, 12, 21, 1, wood.shadow).rect(7, 8, 17, 1, wood.shadow).rect(3, 18, 25, 1, wood.shadow);
  const spines = [green.light, paper.light, olive.light, green.shadow, paper.base, olive.light, green.light];
  for (let x = 6, i = 0; x < 25; x += 2, i += 1) {
    r.rect(x, 13, 1, 5, spines[i % spines.length] ?? paper.base);
    if (x > 8 && x < 23) {
      r.rect(x, 9, 1, 3, spines[(i + 3) % spines.length] ?? paper.base);
    }
  }
  eye(r, 28, 11, moodFor(act, "smug"));
  r.set(27, 11, "k").set(30, 11, "k").set(30, 13, "k").set(31, 13, "k");
  return tinted(r);
}

function lockedPangolin(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(34, 26);
  r.ellipse(15, 14, 13, 9, teal.base).ellipse(28, 17, 4, 3, teal.base);
  r.polygon([[29, 15], [33, 18], [29, 20]], teal.base);
  [8, 20].forEach((x, i) => r.rect(x, 21 + (stride(frame, i ? 1 : -1) > 0 ? 1 : 0), 3, 4, teal.shadow));
  light(r, teal);
  for (let y = 7, row = 0; y < 22; y += 3, row += 1) {
    for (let x = 4 + (row % 2) * 2; x < 26; x += 4) {
      if (r.get(x, y) !== "." && r.get(x + 2, y) !== ".") {
        r.set(x, y, teal.shadow).set(x + 1, y + 1, teal.shadow).set(x + 2, y, teal.shadow);
      }
    }
  }
  const jiggle = frame % 2;
  r.ring(16, 12 - jiggle, 2, 2, 1, steel.base).rect(13, 13 - jiggle, 7, 6, yellow.base);
  light(r, yellow);
  r.rect(16, 15 - jiggle, 1, 2, "k");
  eye(r, 28, 16, moodFor(act, "smug"));
  r.set(33, 18, "k");
  return tinted(r);
}

function exportSquirrel(frame: number, act: Act = "walk"): Sprite {
  const r = new Raster(24, 20);
  const bob = frame % 2;
  r.ellipse(5, 8 - bob, 4.5, 6.5, coral.base);
  r.ellipse(12, 13, 5, 4.5, coral.base).ellipse(17, 8 + bob, 3.5, 3.5, coral.base);
  r.polygon([[15, 5 + bob], [16, 2 + bob], [18, 5 + bob]], coral.base);
  light(r, coral);
  r.ellipse(13, 14, 2.5, 2.5, coral.hi).line(3, 4 - bob, 5, 12 - bob, coral.shadow);
  r.ellipse(21, 13, 2.5, 2.5, green.base);
  light(r, green);
  r.set(21, 11, "w").set(20, 12, "w").set(21, 12, "w").set(22, 12, "w").set(21, 13, "w").set(21, 14, "w");
  eye(r, 18, 7 + bob, moodFor(act, "worried"));
  r.set(20, 9 + bob, "k");
  leg(r, 10, 17, 19, stride(frame, 1, 2));
  leg(r, 14, 17, 19, stride(frame, -1, 2));
  r.rect(22, 1 + bob, 1, 2, blue.light).set(22, 3 + bob, blue.hi);
  return tinted(r);
}

export const MEMORY_LANE: Readonly<Partial<Record<RegularKind, Pose>>> = {
  grunt: stickySnail,
  splitter: duplicateRabbit,
  runner: contextLeech,
  brute: wikiTortoise,
  heavy: lockedPangolin,
  lootRunner: exportSquirrel,
};
