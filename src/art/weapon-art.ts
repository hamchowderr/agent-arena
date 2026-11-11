import { WEAPONS, type WeaponId, type WeaponKind } from "../sim/arena/content";
import { light, lightAll, RAMPS, tinted, type Ramp } from "./form";
import { Raster } from "./raster";
import type { Sprite } from "./sprites";

const { yellow, orange, red, blue, purple, wood, tan, teal, paper, steel, charcoal, green } = RAMPS;

export type WeaponStage = 0 | 1 | 2;
export const WEAPON_STAGES: readonly WeaponStage[] = [0, 1, 2];

export function weaponStage(level: number): WeaponStage {
  return level >= 5 ? 2 : level >= 3 ? 1 : 0;
}

export const SHOT_FRAMES = 2;

export type ShotPlace = "flying" | "flat" | "wave" | "rayHead" | "hop" | "ground";

export const SHOT_PLACE: Readonly<Record<WeaponKind, ShotPlace>> = {
  bolt: "flying",
  beam: "flat",
  homing: "flat",
  seeker: "flying",
  orbit: "flying",
  bomb: "flying",
  brick: "flying",
  pulse: "wave",
  laser: "rayHead",
  chain: "hop",
  mine: "ground",
};

export function shotPlace(weapon: WeaponId): ShotPlace {
  return SHOT_PLACE[WEAPONS[weapon].kind];
}

export const SHOT_GLOW: Readonly<Record<WeaponId, string>> = {
  prompt: "#ffcd75",
  webSearch: "#41a6f6",
  ragSearch: "#73eff7",
  codeExec: "#ef7d57",
  codeInterpreter: "#ffcd75",
  browser: "#b47ae8",
  computerUse: "#d8a8ff",
  shell: "#c8905a",
  ciPipeline: "#f0c890",
  voice: "#6ae8d0",
  realtimeVoice: "#c8fff0",
  subagents: "#b47ae8",
  coderSubagent: "#b47ae8",
  agentNetwork: "#d8a8ff",
  durableAgentTeam: "#d8a8ff",
  fileReader: "#ffcd75",
  mapReduce: "#ef7d57",
  apiCall: "#41a6f6",
  mcpServer: "#73eff7",
  scheduledJob: "#ef7d57",
  durableWorkflow: "#ffcd75",
};

type Painter = (stage: WeaponStage, frame: number) => Sprite;

function star(r: Raster, x: number, y: number, reach: number, arm: string, core = "w"): void {
  for (let step = 1; step <= reach; step += 1) {
    r.set(x - step, y, arm).set(x + step, y, arm).set(x, y - step, arm).set(x, y + step, arm);
  }
  r.set(x, y, core);
}

function chevron(r: Raster, x: number, y: number, size: number, key: string): void {
  for (let step = 0; step <= size; step += 1) {
    r.set(x + step, y - size + step, key).set(x + step, y + size - step, key);
  }
}

function prompt(stage: WeaponStage, frame: number): Sprite {
  const width = 9 + stage * 2;
  const height = 7 + stage * 2;
  const top = stage === 0 ? 0 : 2;
  const r = new Raster(width + (stage === 0 ? 0 : 3), height + top + 3);
  r.rect(1, top, width - 2, height, yellow.base).rect(0, top + 1, width, height - 2, yellow.base);
  r.rect(1, top + height, 3, 1, yellow.base).rect(1, top + height + 1, 2, 1, yellow.base).set(1, top + height + 2, yellow.base);
  light(r, yellow);
  const middle = top + Math.floor(height / 2);
  const size = 1 + Math.floor(stage / 2);
  chevron(r, 2, middle, size, orange.shadow);
  if (frame === 0) {
    r.rect(4 + size, middle + size, 2 + stage, 1, orange.base);
  }
  r.set(1, top + 1, "w");
  if (stage > 0) {
    star(r, width + 1, 2, frame === 0 ? stage : stage - 1, orange.light);
  }
  if (stage === 2) {
    r.set(width - 1, top + height + 1, frame === 0 ? yellow.hi : orange.light);
  }
  return tinted(r);
}

function lens(r: Raster, x: number, y: number, radius: number, rim: Ramp): void {
  r.ellipse(x, y, radius, radius, rim.base);
  light(r, rim);
  r.ellipse(x, y, radius - 1.5, radius - 1.5, blue.light);
  r.set(x - 1, y - 1, "w").set(x - 1, y - 2, "w").set(x - 2, y - 1, "w");
}

function streak(r: Raster, from: number, to: number, middle: number, half: number, frame: number): void {
  for (let x = from; x <= to; x += 1) {
    const reach = (x - from) / Math.max(1, to - from);
    for (let dy = -half; dy <= half; dy += 1) {
      const edge = Math.abs(dy) / Math.max(1, half);
      const dither = (x + dy + frame) % 2 === 0;
      const color = edge === 0 ? (reach > 0.5 ? "w" : reach > 0.2 ? "m" : dither ? "c" : null) : edge < 1 ? (reach > 0.45 ? "m" : reach > 0.15 && dither ? "c" : null) : reach > 0.6 && dither ? "c" : null;
      if (color) {
        r.set(x, middle + dy, color);
      }
    }
  }
}

function webSearch(stage: WeaponStage, frame: number): Sprite {
  const length = 16 + stage * 4;
  const height = 7 + stage * 2;
  const middle = Math.floor(height / 2);
  const radius = middle;
  const r = new Raster(length, height);
  streak(r, 0, length - radius * 2, middle, Math.max(1, middle - 2), frame);
  lens(r, length - radius - 1, middle, radius, blue);
  return tinted(r);
}

function ragSearch(_: WeaponStage, frame: number): Sprite {
  const length = 30;
  const height = 13;
  const middle = 6;
  const r = new Raster(length, height);
  streak(r, 0, length - 12, middle, 3, frame);
  for (const [x, y] of [[6, 1], [12, 10], [17, 2]] as const) {
    const shift = frame === 0 ? 0 : 1;
    r.rect(x + shift, y, 3, 3, paper.light).set(x + shift + 1, y + 1, "c");
  }
  lens(r, length - 7, middle, 6, yellow);
  return tinted(r);
}

function bomb(r: Raster, x: number, y: number, radius: number, frame: number): void {
  r.ellipse(x, y, radius, radius, orange.base);
  light(r, orange);
  const fuseX = x + Math.round(radius * 0.6);
  const fuseY = y - Math.round(radius * 0.75);
  r.set(fuseX, fuseY - 1, wood.shadow).set(fuseX + 1, fuseY - 2, wood.shadow);
  if (frame === 0) {
    star(r, fuseX + 2, fuseY - 3, 1, yellow.light);
  } else {
    r.set(fuseX + 2, fuseY - 3, "w").set(fuseX + 3, fuseY - 4, yellow.light).set(fuseX + 1, fuseY - 4, red.light);
  }
}

function braces(r: Raster, x: number, y: number, key: string): void {
  r.set(x, y - 1, key).set(x - 1, y, key).set(x, y + 1, key);
  r.set(x + 3, y - 1, key).set(x + 4, y, key).set(x + 3, y + 1, key);
}

function codeExec(stage: WeaponStage, frame: number): Sprite {
  const radius = 4 + stage;
  const size = radius * 2 + 5;
  const r = new Raster(size, size);
  const center = radius;
  bomb(r, center, center + 4, radius, frame);
  braces(r, center - 1, center + 4, red.shadow);
  if (stage === 2) {
    r.set(1, 3, frame === 0 ? red.light : orange.light).set(2 * radius, size - 1, frame === 0 ? orange.light : red.light);
  }
  return tinted(r);
}

function codeInterpreter(_: WeaponStage, frame: number): Sprite {
  const r = new Raster(17, 18);
  r.rect(1, 5, 15, 12, orange.base).rect(0, 6, 17, 10, orange.base);
  light(r, orange);
  r.rect(3, 9, 11, 5, red.base);
  chevron(r, 4, 11, 1, yellow.hi);
  if (frame === 0) {
    r.rect(7, 12, 4, 1, yellow.hi);
  }
  r.rect(2, 6, 1, 1, red.light).rect(4, 6, 1, 1, yellow.light).rect(6, 6, 1, 1, green.light);
  const flame = frame === 0 ? [[13, 4], [12, 3], [13, 2], [14, 1]] : [[13, 4], [14, 3], [13, 2], [12, 1]];
  for (const [x, y] of flame) {
    r.set(x ?? 0, y ?? 0, yellow.light);
  }
  r.set(13, 3, "w").set(frame === 0 ? 11 : 15, 2, red.light);
  return tinted(r);
}

function cursor(r: Raster, x: number, y: number, size: number, ramp: Ramp): void {
  const notch = Math.ceil(size * 0.45);
  for (let row = 0; row < size; row += 1) {
    r.rect(x, y + row, row < size - 1 ? row + 1 : notch, 1, ramp.base);
  }
  const stem = Math.ceil(size * 0.3);
  for (let step = 0; step < Math.ceil(size * 0.45); step += 1) {
    r.rect(x + stem + Math.floor(step / 2), y + size - 1 + step, 2, 1, ramp.base);
  }
  light(r, ramp);
  r.line(x + 1, y + 2, x + 1, y + size - 2, "w");
}

function browser(stage: WeaponStage, frame: number): Sprite {
  const size = 8 + stage * 2;
  const pad = stage === 0 ? 0 : 3;
  const r = new Raster(size + pad + 2, size + pad + 4);
  cursor(r, pad, pad, size, purple);
  r.set(pad, pad, frame === 0 ? purple.hi : "w");
  if (stage > 0) {
    if (frame === 0) {
      r.set(pad - 2, pad - 2, purple.hi);
    } else {
      r.set(pad - 3, pad - 1, purple.light).set(pad - 1, pad - 3, purple.light);
    }
  }
  if (stage === 2) {
    star(r, size + pad, 2, frame === 0 ? 1 : 2, purple.light);
  }
  return tinted(r);
}

function computerUse(_: WeaponStage, frame: number): Sprite {
  const r = new Raster(22, 22);
  r.rect(0, 0, 17, 15, purple.base);
  light(r, purple);
  r.rect(1, 3, 15, 11, paper.light);
  r.set(2, 1, red.light).set(4, 1, yellow.light).set(6, 1, green.light);
  r.rect(3, 5, 7, 1, purple.light).rect(3, 7, 10, 1, paper.shadow).rect(3, 9, 8, 1, paper.shadow).rect(3, 11, 9, 1, paper.shadow);
  const shift = frame === 0 ? 0 : 1;
  cursor(r, 11 + shift, 9 + shift, 8, purple);
  r.set(8 + shift, 5 + shift, purple.hi).set(7 + shift, 7 + shift, purple.light);
  return tinted(r);
}

function crate(r: Raster, x: number, y: number, width: number, height: number): void {
  r.rect(x, y, width, height, tan.base);
  light(r, tan);
  for (let row = y + 4; row < y + height - 2; row += 4) {
    r.rect(x + 1, row, width - 2, 1, tan.shadow);
  }
}

function shell(stage: WeaponStage, frame: number): Sprite {
  const width = 12 + stage * 2;
  const height = 8 + stage;
  const r = new Raster(width, height);
  crate(r, 0, 0, width, height);
  const middle = Math.floor(height / 2);
  chevron(r, 2, middle, 1, charcoal.shadow);
  if (frame === 0) {
    r.rect(5, middle + 1, 3, 1, charcoal.shadow);
  }
  if (stage > 0) {
    r.set(1, 1, steel.light).set(width - 2, 1, steel.light).set(1, height - 2, steel.base).set(width - 2, height - 2, steel.base);
  }
  if (stage === 2) {
    r.rect(width - 4, 0, 1, height, steel.light).set(width - 4, 0, steel.hi);
  }
  return tinted(r);
}

function ciPipeline(_: WeaponStage, frame: number): Sprite {
  const r = new Raster(20, 14);
  crate(r, 0, 4, 12, 10);
  crate(r, 8, 0, 12, 10);
  r.rect(8, 4, 1, 6, tan.shadow);
  r.rect(0, 9, 12, 1, steel.light).rect(8, 5, 12, 1, steel.light);
  const check = frame === 0 ? green.light : "w";
  r.set(11, 3, check).set(12, 4, check).set(13, 3, check).set(14, 2, check).set(15, 1, check);
  chevron(r, 2, 11, 1, charcoal.shadow);
  return tinted(r);
}

function arc(r: Raster, x: number, y: number, radius: number, thickness: number, key: string): void {
  for (let row = -radius; row <= radius; row += 1) {
    for (let column = 0; column <= radius; column += 1) {
      const distance = Math.hypot(column, row);
      if (distance <= radius && distance > radius - thickness && column > Math.abs(row) * 0.35) {
        r.set(x + column, y + row, key);
      }
    }
  }
}

function voice(stage: WeaponStage, frame: number): Sprite {
  const radius = 5 + stage;
  const r = new Raster(radius + 2, radius * 2 + 1);
  arc(r, 0, radius, radius, 2.2, teal.base);
  light(r, teal);
  r.set(radius - 1, radius - (frame === 0 ? 2 : -2), "w");
  return tinted(r);
}

function realtimeVoice(_: WeaponStage, frame: number): Sprite {
  const radius = 8;
  const r = new Raster(radius + 2, radius * 2 + 1);
  arc(r, 0, radius, radius, 2.4, teal.base);
  arc(r, -4, radius, radius - 1, 2, teal.base);
  light(r, teal);
  r.set(radius - 1, radius + (frame === 0 ? -3 : 3), "w").set(4, radius, yellow.light).set(radius, radius, yellow.light);
  return tinted(r);
}

function shard(r: Raster, x: number, y: number, width: number, height: number, ramp: Ramp): void {
  r.polygon([[x + width / 2, y], [x + width, y + height * 0.45], [x + width / 2, y + height], [x, y + height * 0.45]], ramp.base);
  light(r, ramp);
}

function subagents(stage: WeaponStage, frame: number): Sprite {
  const width = 7 + stage * 2;
  const height = 9 + stage * 2;
  const r = new Raster(width + 2, height + 2);
  shard(r, 1, 0, width, height, purple);
  const center = 1 + Math.floor(width / 2);
  r.set(center, Math.floor(height * 0.45), "w").set(center, Math.floor(height * 0.45) + (frame === 0 ? -1 : 1), purple.hi);
  if (stage > 0) {
    r.set(frame === 0 ? 0 : width + 1, height - 1, purple.light);
  }
  if (stage === 2) {
    r.set(frame === 0 ? width + 1 : 0, 2, "w");
  }
  return tinted(r);
}

function coderSubagent(stage: WeaponStage, frame: number): Sprite {
  const size = 9 + stage * 2;
  const r = new Raster(size, size + 3);
  r.rect(2, 0, size - 4, size, purple.base).rect(0, 2, size, size - 4, purple.base).rect(1, 1, size - 2, size - 2, purple.base);
  light(r, purple);
  const middle = Math.floor(size / 2);
  r.rect(middle - 3, middle - 1, 7, 3, purple.hi);
  braces(r, middle - 2, middle, orange.base);
  r.set(middle, middle, "w");
  const flick = frame === 0 ? [middle - 1, middle + 1] : [middle];
  for (const x of flick) {
    r.set(x, size, orange.light).set(x, size + 1, frame === 0 ? red.light : orange.base);
  }
  if (stage === 2) {
    r.set(middle, size + 2, yellow.light);
  }
  return tinted(r);
}

function node(r: Raster, x: number, y: number, radius: number, ramp: Ramp): void {
  r.ellipse(x, y, radius, radius, ramp.base);
}

function network(r: Raster, center: number, reach: number, count: number, turn: number, core: Ramp, rim: Ramp | null): void {
  const satellites = Array.from({ length: count }, (_, index) => {
    const angle = turn + (index * Math.PI * 2) / count;
    return [Math.round(center + Math.cos(angle) * reach), Math.round(center + Math.sin(angle) * reach)] as const;
  });
  for (const [x, y] of satellites) {
    r.line(center, center, x, y, purple.light);
  }
  if (rim) {
    r.ring(center, center, 5, 5, 1.2, rim.base);
  }
  node(r, center, center, rim ? 4.2 : 4, core);
  for (const [x, y] of satellites) {
    node(r, x, y, 2, core);
  }
  lightAll(r, core, ...(rim ? [rim] : []));
  r.set(center - 1, center - 1, "w");
}

function agentNetwork(_: WeaponStage, frame: number): Sprite {
  const r = new Raster(19, 19);
  network(r, 9, 7.5, 4, frame === 0 ? 0 : Math.PI / 4, purple, null);
  r.set(9, 9, "m");
  return tinted(r);
}

function durableAgentTeam(_: WeaponStage, frame: number): Sprite {
  const r = new Raster(23, 23);
  network(r, 11, 9.5, 6, frame === 0 ? 0 : Math.PI / 6, purple, yellow);
  r.set(11, 11, yellow.hi);
  return tinted(r);
}

function page(r: Raster, x: number, y: number, width: number, height: number, ink: string): void {
  r.rect(x, y, width, height, paper.base);
  light(r, paper);
  r.set(x + width - 1, y, ".").set(x + width - 2, y, paper.shadow).set(x + width - 1, y + 1, paper.shadow);
  for (let row = y + 2; row < y + height - 1; row += 2) {
    r.rect(x + 1, row, row % 4 === 0 ? width - 3 : width - 4, 1, ink);
  }
}

function fileReader(stage: WeaponStage, frame: number): Sprite {
  const width = 7 + stage * 2;
  const height = 9 + stage * 2;
  const r = new Raster(width + 3, height + 2);
  page(r, 1, 1, width, height, orange.base);
  const glow = frame === 0 ? yellow.light : orange.light;
  r.set(0, Math.floor(height / 2), glow).set(0, Math.floor(height / 2) + 2, glow);
  if (stage > 0) {
    star(r, width + 1, 1, 1, yellow.light);
  }
  return tinted(r);
}

function mapReduce(_: WeaponStage, frame: number): Sprite {
  const r = new Raster(19, 17);
  const lift = frame === 0 ? 0 : 1;
  page(r, 0, 4 + lift, 9, 11, red.base);
  page(r, 5, 2, 9, 12, orange.base);
  page(r, 10, 1 - lift + 1, 9, 13, yellow.shadow);
  r.set(18, 0, "w").set(17, 0, yellow.light);
  return tinted(r);
}

function plug(r: Raster, x: number, y: number, radius: number, ramp: Ramp): void {
  r.ellipse(x, y, radius, radius, ramp.base);
  light(r, ramp);
}

function apiCall(stage: WeaponStage, frame: number): Sprite {
  const radius = 3 + stage;
  const size = radius * 2 + 5;
  const center = Math.floor(size / 2);
  const r = new Raster(size, size);
  plug(r, center, center, radius, blue);
  braces(r, center - 1, center, "w");
  const reach = radius + (frame === 0 ? 1 : 2);
  r.set(center - reach, center, "m").set(center + reach, center, "m").set(center, center - reach, "m").set(center, center + reach, "m");
  return tinted(r);
}

function mcpServer(_: WeaponStage, frame: number): Sprite {
  const r = new Raster(17, 17);
  r.ring(8, 8, 7, 7, 1.4, blue.light);
  plug(r, 8, 8, 4.6, blue);
  r.rect(8, 0, 1, 2, yellow.light).rect(8, 15, 1, 2, yellow.light).rect(0, 8, 2, 1, yellow.light).rect(15, 8, 2, 1, yellow.light);
  braces(r, 7, 8, "w");
  r.set(8, 8, frame === 0 ? "m" : "w");
  return tinted(r);
}

function clock(r: Raster, center: number, radius: number, body: Ramp, frame: number, rim: Ramp | null): void {
  const shake = frame === 0 ? 0 : 1;
  r.ellipse(center - radius + 1 - shake, 2, 2, 1.6, body.base).ellipse(center + radius - 1 + shake, 2, 2, 1.6, body.base);
  r.ellipse(center, center + 2, radius, radius, body.base);
  if (rim) {
    r.ring(center, center + 2, radius, radius, 1.2, rim.base);
  }
  lightAll(r, body, ...(rim ? [rim] : []));
  r.ellipse(center, center + 2, radius - 2, radius - 2, paper.light);
  r.line(center, center + 2, center, center - radius + 4, charcoal.shadow).line(center, center + 2, center + 2, center + 2, charcoal.shadow);
  r.set(center, center + 2, red.base);
  r.set(center - 2, center + radius + 2, body.shadow).set(center + 2, center + radius + 2, body.shadow);
}

function scheduledJob(stage: WeaponStage, frame: number): Sprite {
  const radius = 5 + stage;
  const size = radius * 2 + 1;
  const r = new Raster(size, size + 3);
  clock(r, radius, radius, frame === 0 ? orange : red, frame, null);
  return tinted(r);
}

function durableWorkflow(_: WeaponStage, frame: number): Sprite {
  const radius = 8;
  const r = new Raster(17, 20);
  clock(r, radius, radius, frame === 0 ? orange : red, frame, yellow);
  r.set(radius + 4, radius - 1, green.light).set(radius + 5, radius, green.light).set(radius + 4, radius + 1, green.light);
  return tinted(r);
}

const PAINTERS: Readonly<Record<WeaponId, Painter>> = {
  prompt,
  webSearch,
  ragSearch,
  codeExec,
  codeInterpreter,
  browser,
  computerUse,
  shell,
  ciPipeline,
  voice,
  realtimeVoice,
  subagents,
  coderSubagent,
  agentNetwork,
  durableAgentTeam,
  fileReader,
  mapReduce,
  apiCall,
  mcpServer,
  scheduledJob,
  durableWorkflow,
};

const CACHE = new Map<string, readonly Sprite[]>();

export function shotFrames(weapon: WeaponId, stage: WeaponStage): readonly Sprite[] {
  const key = `${weapon}:${stage}`;
  const cached = CACHE.get(key);
  if (cached) {
    return cached;
  }
  const frames = Array.from({ length: SHOT_FRAMES }, (_, frame) => PAINTERS[weapon](stage, frame));
  CACHE.set(key, frames);
  return frames;
}

export function weaponSprite(weapon: WeaponId, stage: WeaponStage): Sprite {
  return shotFrames(weapon, stage)[0] ?? [];
}
