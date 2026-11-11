import { WEAPONS, type WeaponDefinition, type WeaponId, type WeaponLevel } from "./content";
import { ANGLE_STEPS, cosStep, distanceSquared, isqrt, percentOf, px, scaleToLength, sinStep, UNIT } from "./math";
import {
  bossInReach,
  damageEnemy,
  effectiveDamage,
  hallucinationPercent,
  HALLUCINATION_VEER,
  nearestEnemy,
  seesThroughFakes,
  type ArenaState,
  type Enemy,
  type OwnedWeapon,
} from "./sim";

export const RAY_TICKS = 30;
export const RAY_HIT_EVERY = 10;
export const RAY_FAN_STEP = 9;
export const REDUCE_FAN_STEP = 14;
export const MINE_RING = px(46);
export const MINE_ARM = 48;
export const MINE_GAP = 12;
export const MINE_REARM = 60;
export const MAX_MINES = 40;
export const SPLASH_PERCENT = 60;
export const CHAIN_FOCUS_RANGE = px(200);

export interface Ray {
  readonly weapon: WeaponId;
  readonly dirX: number;
  readonly dirY: number;
  readonly length: number;
  readonly width: number;
  readonly damage: number;
  readonly reduce: number;
  readonly hit: Map<number, number>;
  readonly hallucinated: boolean;
  life: number;
}

export interface Mine {
  readonly weapon: WeaponId;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly damage: number;
  readonly order: number;
  fuse: number;
  repeats: number;
}

export type ToolEvent =
  | { readonly kind: "chain"; readonly weapon: WeaponId; readonly points: readonly number[] }
  | { readonly kind: "mine"; readonly weapon: WeaponId; readonly x: number; readonly y: number; readonly radius: number; readonly order: number }
  | { readonly kind: "reduced"; readonly x: number; readonly y: number; readonly radius: number }
  | { readonly kind: "splash"; readonly weapon: WeaponId; readonly x: number; readonly y: number; readonly radius: number };

function definitionOf(id: WeaponId): WeaponDefinition {
  return WEAPONS[id];
}

export function fireTool(state: ArenaState, owned: OwnedWeapon, stats: WeaponLevel, range: number): "fired" | "idle" | "none" {
  switch (definitionOf(owned.id).kind) {
    case "laser":
      return fireLaser(state, owned, stats, range);
    case "chain":
      return fireChain(state, owned, stats, range);
    case "mine":
      layMines(state, owned, stats);
      return "fired";
    default:
      return "none";
  }
}

function fireLaser(state: ArenaState, owned: OwnedWeapon, stats: WeaponLevel, range: number): "fired" | "idle" {
  const target = bossInReach(state, CHAIN_FOCUS_RANGE) ?? nearestEnemy(state, state.player.x, state.player.y, range);
  if (!target) {
    return "idle";
  }
  const definition = definitionOf(owned.id);
  const reduce = definition.reduce ?? 0;
  const step = reduce > 0 ? REDUCE_FAN_STEP : RAY_FAN_STEP;
  const aim = scaleToLength(target.x - state.player.x, target.y - state.player.y, UNIT);
  for (let index = 0; index < stats.count; index += 1) {
    const hallucinated = state.rng.chancePercent(hallucinationPercent(state));
    const spread = (index - Math.trunc(stats.count / 2)) * step;
    const turn = hallucinated ? spread + state.rng.intBelow(HALLUCINATION_VEER * 2 + 1) - HALLUCINATION_VEER : spread;
    const angle = ((turn % ANGLE_STEPS) + ANGLE_STEPS) % ANGLE_STEPS;
    state.rays.push({
      weapon: owned.id,
      dirX: Math.trunc((aim.x * cosStep(angle) - aim.y * sinStep(angle)) / UNIT),
      dirY: Math.trunc((aim.x * sinStep(angle) + aim.y * cosStep(angle)) / UNIT),
      length: px(definition.length ?? 160),
      width: px(stats.radius),
      damage: effectiveDamage(state, stats.damage),
      reduce: spread === 0 && !hallucinated ? px(reduce) : 0,
      hit: new Map(),
      hallucinated,
      life: RAY_TICKS,
    });
    if (hallucinated) {
      state.events.push({ kind: "hallucinated", x: state.player.x, y: state.player.y });
    }
  }
  return "fired";
}

export function rayEnd(state: ArenaState, ray: Ray): { readonly x: number; readonly y: number } {
  return { x: state.player.x + Math.trunc((ray.dirX * ray.length) / UNIT), y: state.player.y + Math.trunc((ray.dirY * ray.length) / UNIT) };
}

function updateRays(state: ArenaState): void {
  const originX = state.player.x;
  const originY = state.player.y;
  const grounded = seesThroughFakes(state);
  for (const ray of state.rays) {
    ray.life -= 1;
    if (!ray.hallucinated) {
      const half = Math.trunc(ray.length / 2);
      const centerX = originX + Math.trunc((ray.dirX * half) / UNIT);
      const centerY = originY + Math.trunc((ray.dirY * half) / UNIT);
      state.grid.forEachNear(centerX, centerY, half + ray.width + px(20), (enemy) => {
        if (enemy.health <= 0 || (grounded && enemy.fake) || state.tick < (ray.hit.get(enemy.id) ?? 0)) {
          return;
        }
        const dx = enemy.x - originX;
        const dy = enemy.y - originY;
        const along = Math.trunc((dx * ray.dirX + dy * ray.dirY) / UNIT);
        if (along < 0 || along > ray.length) {
          return;
        }
        const across = Math.abs(Math.trunc((dx * ray.dirY - dy * ray.dirX) / UNIT));
        if (across > ray.width + enemy.radius) {
          return;
        }
        ray.hit.set(enemy.id, state.tick + RAY_HIT_EVERY);
        damageEnemy(state, enemy, ray.damage, ray.weapon);
      });
    }
    if (ray.life === 0 && ray.reduce > 0) {
      const end = rayEnd(state, ray);
      state.events.push({ kind: "reduced", x: end.x, y: end.y, radius: ray.reduce });
      blastAt(state, end.x, end.y, ray.reduce, ray.damage * 2, ray.weapon, null);
    }
  }
}

function nextLink(state: ArenaState, x: number, y: number, reach: number, hit: ReadonlySet<number>): Enemy | null {
  const found: { enemy: Enemy | null; distance: number } = { enemy: null, distance: reach * reach };
  const grounded = seesThroughFakes(state);
  state.grid.forEachNear(x, y, reach, (enemy) => {
    if (enemy.health <= 0 || hit.has(enemy.id) || (grounded && enemy.fake)) {
      return;
    }
    const distance = distanceSquared(x, y, enemy.x, enemy.y);
    if (distance < found.distance || (distance === found.distance && found.enemy !== null && enemy.id < found.enemy.id)) {
      found.distance = distance;
      found.enemy = enemy;
    }
  });
  return found.enemy;
}

function fireChain(state: ArenaState, owned: OwnedWeapon, stats: WeaponLevel, range: number): "fired" | "idle" {
  const first = bossInReach(state, CHAIN_FOCUS_RANGE) ?? nearestEnemy(state, state.player.x, state.player.y, range);
  if (!first) {
    return "idle";
  }
  const hit = new Set<number>();
  const damage = effectiveDamage(state, stats.damage);
  const reach = px(stats.radius);
  for (let chain = 0; chain < stats.count; chain += 1) {
    const start = chain === 0 ? first : nextLink(state, state.player.x, state.player.y, range, hit);
    if (!start) {
      break;
    }
    const points: number[] = [state.player.x, state.player.y - px(4)];
    let current: Enemy | null = start;
    for (let link = 0; current && link <= stats.pierce; link += 1) {
      hit.add(current.id);
      points.push(current.x, current.y);
      const { x, y } = current;
      damageEnemy(state, current, damage, owned.id);
      current = nextLink(state, x, y, reach, hit);
    }
    state.events.push({ kind: "chain", weapon: owned.id, points });
  }
  return "fired";
}

function layMines(state: ArenaState, owned: OwnedWeapon, stats: WeaponLevel): void {
  const turn = (state.tick * 7) % ANGLE_STEPS;
  const damage = effectiveDamage(state, stats.damage);
  for (let order = 0; order < stats.count && state.mines.length < MAX_MINES; order += 1) {
    const angle = turn + Math.trunc((order * ANGLE_STEPS) / stats.count);
    state.mines.push({
      weapon: owned.id,
      x: state.player.x + Math.trunc((cosStep(angle) * MINE_RING) / UNIT),
      y: state.player.y + Math.trunc((sinStep(angle) * MINE_RING) / UNIT),
      radius: px(stats.radius),
      damage,
      order,
      fuse: MINE_ARM + order * MINE_GAP,
      repeats: stats.pierce,
    });
  }
}

function updateMines(state: ArenaState): void {
  for (const mine of state.mines) {
    mine.fuse -= 1;
    if (mine.fuse > 0) {
      continue;
    }
    state.events.push({ kind: "mine", weapon: mine.weapon, x: mine.x, y: mine.y, radius: mine.radius, order: mine.order });
    blastAt(state, mine.x, mine.y, mine.radius, mine.damage, mine.weapon, null);
    mine.repeats -= 1;
    mine.fuse = mine.repeats > 0 ? MINE_REARM : 0;
  }
  filterInPlace(state.mines, (mine) => mine.repeats > 0);
}

function blastAt(state: ArenaState, x: number, y: number, radius: number, damage: number, weapon: WeaponId, skip: number | null): void {
  const victims: Enemy[] = [];
  state.grid.forEachNear(x, y, radius + px(20), (enemy) => {
    if (enemy.health <= 0 || enemy.id === skip) {
      return;
    }
    const reach = radius + enemy.radius;
    if (distanceSquared(x, y, enemy.x, enemy.y) <= reach * reach) {
      victims.push(enemy);
    }
  });
  for (const enemy of victims) {
    if (enemy.health > 0) {
      damageEnemy(state, enemy, damage, weapon);
    }
  }
}

export function splashFrom(state: ArenaState, weapon: WeaponId, enemy: Enemy, damage: number): void {
  const splash = definitionOf(weapon).splash ?? 0;
  if (splash === 0) {
    return;
  }
  const radius = px(splash);
  state.events.push({ kind: "splash", weapon, x: enemy.x, y: enemy.y, radius });
  blastAt(state, enemy.x, enemy.y, radius, percentOf(damage, SPLASH_PERCENT), weapon, enemy.id);
}

export function dronePhase(id: WeaponId): number {
  return id === "coderSubagent" ? ANGLE_STEPS / 2 : 0;
}

export function updateTools(state: ArenaState): void {
  updateRays(state);
  updateMines(state);
  filterInPlace(state.rays, (ray) => ray.life > 0);
}

function filterInPlace<T>(items: T[], keep: (item: T) => boolean): void {
  let write = 0;
  for (const item of items) {
    if (keep(item)) {
      items[write] = item;
      write += 1;
    }
  }
  items.length = write;
}

export function chainLength(points: readonly number[]): number {
  let total = 0;
  for (let index = 2; index + 1 < points.length; index += 2) {
    const dx = (points[index] ?? 0) - (points[index - 2] ?? 0);
    const dy = (points[index + 1] ?? 0) - (points[index - 1] ?? 0);
    total += isqrt(dx * dx + dy * dy);
  }
  return total;
}
