import { createRng, mixSeed, type Rng } from "../rng";
import type { Tier } from "../tiers";
import { offerCards, type Card } from "./cards";
import {
  BOSS_EVERY_SECONDS,
  ENEMIES,
  EVOLUTIONS,
  PASSIVES,
  WEAPONS,
  WORLDS,
  type EnemyKind,
  type WorldId,
  type PassiveId,
  type PassiveStat,
  type WeaponId,
  type WeaponKind,
  type World,
} from "./content";
import { Grid } from "./grid";
import { isSimPhase, nextPhase, type RunEvent, type SimPhase } from "./run-loop";
import { ANGLE_STEPS, cosStep, distanceSquared, isqrt, percentOf, px, scaleToLength, seconds, sinStep, SUB, TICKS_PER_SECOND, UNIT } from "./math";

export const PLAYER_SPEED = 16;
export const PLAYER_RADIUS = px(5);
export const BASE_HEALTH = 100;
export const HEALTH_PER_TIER = 25;
export const BASE_CRIT = 5;
export const BASE_HALLUCINATION = 30;
export const HALLUCINATION_PER_TIER = 5;
export const BASE_PICKUP = px(32);
export const DASH_TICKS = 8;
export const DASH_SPEED = 64;
export const DASH_RECHARGE = seconds(3);
export const HURT_INVULNERABLE = 30;
export const SPAWN_DISTANCE = px(250);
export const DESPAWN_DISTANCE = px(460);
export const BOSS_ENTRY_DISTANCE = px(85);
export const KNOCKBACK = 24;
const BOSS_KNOCKBACK = 3;
const KNOCKBACK_KEEP_PERCENT = 60;
const SCREEN_TOP_ANGLE = (ANGLE_STEPS * 3) / 4;
const BOSS_ENTRY_SPREAD = ANGLE_STEPS / 8;
export const MAX_ENEMIES = 420;
export const RUN_REROLLS = 2;
export const RUN_SKIPS = 2;
export const SLAM_WARNING = 60;
export const SLAM_RADIUS = px(40);
export const SLAM_EVERY = seconds(5);
export const SLAM_DAMAGE = 22;

export interface Enemy {
  readonly id: number;
  readonly kind: EnemyKind;
  x: number;
  y: number;
  health: number;
  readonly maxHealth: number;
  hitFlash: number;
  knockX: number;
  knockY: number;
  readonly speed: number;
  readonly damage: number;
  readonly radius: number;
  readonly xp: number;
}

export interface Projectile {
  readonly weapon: WeaponId;
  readonly kind: WeaponKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly damage: number;
  pierce: number;
  life: number;
  readonly radius: number;
  readonly hit: Set<number>;
  readonly hallucinated: boolean;
}

export interface Gem {
  x: number;
  y: number;
  readonly value: number;
  pulled: boolean;
}

export interface OwnedWeapon {
  readonly id: WeaponId;
  level: number;
  cooldown: number;
  readonly orbitHits: Map<number, number>;
}

export interface Slam {
  readonly x: number;
  readonly y: number;
  ticksLeft: number;
}

export type ArenaEvent =
  | { readonly kind: "damage"; readonly x: number; readonly y: number; readonly amount: number; readonly crit: boolean; readonly boss: boolean }
  | { readonly kind: "kill"; readonly x: number; readonly y: number; readonly enemy: EnemyKind }
  | { readonly kind: "hurt"; readonly amount: number }
  | { readonly kind: "hallucinated"; readonly x: number; readonly y: number }
  | { readonly kind: "pulse"; readonly x: number; readonly y: number; readonly radius: number; readonly weapon: WeaponId }
  | { readonly kind: "levelUp"; readonly level: number }
  | { readonly kind: "bossArrives"; readonly world: number }
  | { readonly kind: "bossDown"; readonly world: number; readonly x: number; readonly y: number }
  | { readonly kind: "tierUp"; readonly tier: Tier }
  | { readonly kind: "dash" }
  | { readonly kind: "slam"; readonly x: number; readonly y: number };

export type Status = SimPhase;

export interface Input {
  readonly moveX: -1 | 0 | 1;
  readonly moveY: -1 | 0 | 1;
  readonly dash: boolean;
}

export const IDLE: Input = { moveX: 0, moveY: 0, dash: false };

export interface Player {
  x: number;
  y: number;
  health: number;
  facingX: number;
  facingY: number;
  dashTicks: number;
  dashCharges: number;
  dashRecharge: number;
  invulnerable: number;
  regenCarry: number;
}

export interface Killer {
  readonly world: WorldId;
  readonly enemy: EnemyKind;
}

export interface ArenaState {
  readonly seed: number;
  readonly rng: Rng;
  tick: number;
  status: Status;
  tier: Tier;
  readonly player: Player;
  readonly enemies: Enemy[];
  readonly projectiles: Projectile[];
  readonly gems: Gem[];
  readonly weapons: OwnedWeapon[];
  readonly passives: Map<PassiveId, number>;
  readonly banished: Set<string>;
  xp: number;
  level: number;
  pendingLevelUps: number;
  cards: Card[];
  rerolls: number;
  skips: number;
  kills: number;
  bossesDown: number;
  bossId: number | null;
  nextBossTick: number;
  slam: Slam | null;
  slamTimer: number;
  spawnCarry: number;
  nextId: number;
  killedBy: Killer | null;
  readonly damageByWeapon: Map<WeaponId, number>;
  readonly grid: Grid<Enemy>;
  events: ArenaEvent[];
}

export function createArena(seed: number): ArenaState {
  return {
    seed,
    rng: createRng(mixSeed(seed, 77)),
    tick: 0,
    status: "playing",
    tier: 1,
    player: {
      x: 0,
      y: 0,
      health: BASE_HEALTH,
      facingX: UNIT,
      facingY: 0,
      dashTicks: 0,
      dashCharges: 1,
      dashRecharge: 0,
      invulnerable: 0,
      regenCarry: 0,
    },
    enemies: [],
    projectiles: [],
    gems: [],
    weapons: [{ id: "prompt", level: 1, cooldown: 30, orbitHits: new Map() }],
    passives: new Map(),
    banished: new Set(),
    xp: 0,
    level: 1,
    pendingLevelUps: 0,
    cards: [],
    rerolls: RUN_REROLLS,
    skips: RUN_SKIPS,
    kills: 0,
    bossesDown: 0,
    bossId: null,
    nextBossTick: seconds(BOSS_EVERY_SECONDS),
    slam: null,
    slamTimer: SLAM_EVERY,
    spawnCarry: 0,
    nextId: 1,
    killedBy: null,
    damageByWeapon: new Map(),
    grid: new Grid<Enemy>(),
    events: [],
  };
}

export function passiveLevel(state: ArenaState, id: PassiveId): number {
  return state.passives.get(id) ?? 0;
}

export function statTotal(state: ArenaState, stat: PassiveStat): number {
  let total = 0;
  for (const [id, owned] of state.passives) {
    const passive = PASSIVES[id];
    if (passive.stat === stat) {
      total += passive.perLevel * owned;
    }
  }
  return total;
}

export function maxHealth(state: ArenaState): number {
  return BASE_HEALTH + HEALTH_PER_TIER * (state.tier - 1) + statTotal(state, "maxHealth");
}

export function hallucinationPercent(state: ArenaState): number {
  return Math.max(0, BASE_HALLUCINATION - HALLUCINATION_PER_TIER * (state.tier - 1) + statTotal(state, "hallucination"));
}

export function critPercent(state: ArenaState): number {
  return Math.min(100, BASE_CRIT + statTotal(state, "crit"));
}

export function pickupRadius(state: ArenaState): number {
  return percentOf(BASE_PICKUP, 100 + statTotal(state, "pickup"));
}

export function playerSpeed(state: ArenaState): number {
  return percentOf(PLAYER_SPEED, 100 + statTotal(state, "speed"));
}

export function weaponStats(id: WeaponId, owned: number) {
  const levels = WEAPONS[id].levels;
  return levels[Math.min(owned, levels.length) - 1] ?? levels[0];
}

export function effectiveCooldown(state: ArenaState, base: number): number {
  return Math.max(6, percentOf(base, 100 + statTotal(state, "cooldown")));
}

export function effectiveDamage(state: ArenaState, base: number): number {
  return Math.max(1, percentOf(base, 100 + statTotal(state, "damage")));
}

export function xpToNext(level: number): number {
  return 2 + level * 3 + Math.trunc((level * level) / 4);
}

export function currentWorld(state: ArenaState): World {
  const world = WORLDS[Math.min(state.bossesDown, WORLDS.length - 1)];
  if (!world) {
    throw new RangeError("No worlds defined");
  }
  return world;
}

function canMove(state: ArenaState, event: RunEvent): boolean {
  return nextPhase(state.status, event) !== null;
}

function move(state: ArenaState, event: RunEvent): void {
  const next = nextPhase(state.status, event);
  if (next === null || !isSimPhase(next)) {
    throw new Error(`Run loop has no ${event} from ${state.status}`);
  }
  state.status = next;
}

export function step(state: ArenaState, input: Input): void {
  state.events = [];
  if (state.status !== "playing") {
    return;
  }
  state.tick += 1;
  movePlayer(state, input);
  regenerate(state);
  spawnEnemies(state);
  spawnBoss(state);
  moveEnemies(state);
  fireWeapons(state);
  moveProjectiles(state);
  updateSlam(state);
  collectGems(state);
  touchPlayer(state);
  removeDead(state);
  if (state.status === "playing" && state.pendingLevelUps > 0) {
    openLevelUp(state);
  }
}

function movePlayer(state: ArenaState, input: Input): void {
  const player = state.player;
  if (player.dashRecharge > 0) {
    player.dashRecharge -= 1;
    if (player.dashRecharge === 0) {
      player.dashCharges = 1;
    }
  }
  if (player.invulnerable > 0) {
    player.invulnerable -= 1;
  }
  if (input.moveX !== 0 || input.moveY !== 0) {
    const facing = scaleToLength(input.moveX, input.moveY, UNIT);
    player.facingX = facing.x;
    player.facingY = facing.y;
  }
  if (input.dash && player.dashCharges > 0 && player.dashTicks === 0) {
    player.dashCharges -= 1;
    player.dashTicks = DASH_TICKS;
    player.dashRecharge = DASH_RECHARGE;
    state.events.push({ kind: "dash" });
  }
  if (player.dashTicks > 0) {
    player.dashTicks -= 1;
    player.x += Math.trunc((player.facingX * DASH_SPEED) / UNIT);
    player.y += Math.trunc((player.facingY * DASH_SPEED) / UNIT);
    return;
  }
  if (input.moveX === 0 && input.moveY === 0) {
    return;
  }
  const velocity = scaleToLength(input.moveX, input.moveY, playerSpeed(state));
  player.x += velocity.x;
  player.y += velocity.y;
}

function regenerate(state: ArenaState): void {
  const regen = statTotal(state, "regen");
  if (regen === 0) {
    return;
  }
  state.player.regenCarry += regen;
  if (state.player.regenCarry >= TICKS_PER_SECOND * 2) {
    state.player.regenCarry -= TICKS_PER_SECOND * 2;
    state.player.health = Math.min(maxHealth(state), state.player.health + 1);
  }
}

function minutesElapsed(state: ArenaState): number {
  return state.tick / (TICKS_PER_SECOND * 60);
}

function spawnsPerSecondTimes100(state: ArenaState): number {
  const seconds = Math.trunc(state.tick / TICKS_PER_SECOND);
  return 220 + seconds * 6;
}

function spawnEnemies(state: ArenaState): void {
  if (state.bossId !== null && state.enemies.length > MAX_ENEMIES / 2) {
    return;
  }
  state.spawnCarry += spawnsPerSecondTimes100(state);
  const threshold = TICKS_PER_SECOND * 100;
  while (state.spawnCarry >= threshold) {
    state.spawnCarry -= threshold;
    if (state.enemies.length >= MAX_ENEMIES) {
      continue;
    }
    const roll = state.rng.intBelow(100);
    const elapsed = minutesElapsed(state);
    const kind: EnemyKind = elapsed > 1 && roll < 8 ? "brute" : elapsed > 0.5 && roll < 35 ? "runner" : "grunt";
    spawnEnemy(state, kind, state.rng.intBelow(ANGLE_STEPS), SPAWN_DISTANCE);
  }
}

function healthScale(state: ArenaState): number {
  const seconds = Math.trunc(state.tick / TICKS_PER_SECOND);
  return 100 + Math.trunc(seconds / 2) + state.bossesDown * 60;
}

function spawnEnemy(state: ArenaState, kind: EnemyKind, angle: number, distance: number): Enemy {
  const definition = ENEMIES[kind];
  const health =
    kind === "boss" ? (WORLDS[state.bossesDown]?.bossHealth ?? 9000) : percentOf(definition.health, healthScale(state));
  const enemy: Enemy = {
    id: state.nextId,
    kind,
    x: state.player.x + Math.trunc((cosStep(angle) * distance) / UNIT),
    y: state.player.y + Math.trunc((sinStep(angle) * distance) / UNIT),
    health,
    maxHealth: health,
    hitFlash: 0,
    knockX: 0,
    knockY: 0,
    speed: definition.speed,
    damage: definition.damage + state.bossesDown * 3 + Math.trunc(state.tick / (TICKS_PER_SECOND * 60)),
    radius: px(definition.radius),
    xp: definition.xp,
  };
  state.nextId += 1;
  state.enemies.push(enemy);
  return enemy;
}

function spawnBoss(state: ArenaState): void {
  if (state.bossId !== null || state.tick < state.nextBossTick || state.bossesDown >= WORLDS.length) {
    return;
  }
  const angle = SCREEN_TOP_ANGLE - BOSS_ENTRY_SPREAD / 2 + state.rng.intBelow(BOSS_ENTRY_SPREAD);
  const boss = spawnEnemy(state, "boss", angle, BOSS_ENTRY_DISTANCE);
  state.bossId = boss.id;
  state.slamTimer = SLAM_EVERY;
  state.events.push({ kind: "bossArrives", world: state.bossesDown });
}

function moveEnemies(state: ArenaState): void {
  state.grid.rebuild(state.enemies);
  const player = state.player;
  for (const enemy of state.enemies) {
    if (enemy.hitFlash > 0) {
      enemy.hitFlash -= 1;
    }
    const toward = scaleToLength(player.x - enemy.x, player.y - enemy.y, enemy.speed);
    let pushX = 0;
    let pushY = 0;
    state.grid.forEachNear(enemy.x, enemy.y, enemy.radius + px(18), (other) => {
      if (other.id === enemy.id) {
        return;
      }
      const reach = enemy.radius + other.radius;
      const dx = enemy.x - other.x;
      const dy = enemy.y - other.y;
      const squared = dx * dx + dy * dy;
      if (squared >= reach * reach) {
        return;
      }
      if (squared === 0) {
        pushX += enemy.id > other.id ? 4 : -4;
        return;
      }
      const overlap = reach - isqrt(squared);
      pushX += Math.trunc((dx * overlap) / (reach * 3));
      pushY += Math.trunc((dy * overlap) / (reach * 3));
    });
    const limit = enemy.kind === "boss" ? 2 : 10;
    enemy.x += toward.x + Math.max(-limit, Math.min(limit, pushX)) + enemy.knockX;
    enemy.y += toward.y + Math.max(-limit, Math.min(limit, pushY)) + enemy.knockY;
    enemy.knockX = Math.trunc((enemy.knockX * KNOCKBACK_KEEP_PERCENT) / 100);
    enemy.knockY = Math.trunc((enemy.knockY * KNOCKBACK_KEEP_PERCENT) / 100);
  }
  state.grid.rebuild(state.enemies);
}

function nearestEnemy(state: ArenaState, x: number, y: number, maxDistance: number): Enemy | null {
  const found: { enemy: Enemy | null; distance: number } = { enemy: null, distance: maxDistance * maxDistance };
  for (let radius = px(48); found.enemy === null && radius < maxDistance * 2; radius *= 2) {
    state.grid.forEachNear(x, y, Math.min(radius, maxDistance), (enemy) => {
      if (enemy.health <= 0) {
        return;
      }
      const distance = distanceSquared(x, y, enemy.x, enemy.y);
      if (distance < found.distance || (distance === found.distance && found.enemy !== null && enemy.id < found.enemy.id)) {
        found.distance = distance;
        found.enemy = enemy;
      }
    });
  }
  return found.enemy;
}

function fireWeapons(state: ArenaState): void {
  for (const owned of state.weapons) {
    const definition = WEAPONS[owned.id];
    const stats = weaponStats(owned.id, owned.level);
    if (definition.kind === "orbit") {
      orbitHits(state, owned);
      continue;
    }
    owned.cooldown -= 1;
    if (owned.cooldown > 0) {
      continue;
    }
    owned.cooldown = effectiveCooldown(state, stats.cooldown);
    if (definition.kind === "pulse") {
      pulse(state, owned.id, px(stats.radius), effectiveDamage(state, stats.damage));
      continue;
    }
    const target = nearestEnemy(state, state.player.x, state.player.y, px(260));
    if (!target) {
      owned.cooldown = 4;
      continue;
    }
    for (let shot = 0; shot < stats.count; shot += 1) {
      const hallucinated = state.rng.chancePercent(hallucinationPercent(state));
      const spread = (shot - Math.trunc(stats.count / 2)) * 10;
      const speed = px(definition.speed);
      const aim = scaleToLength(target.x - state.player.x, target.y - state.player.y, speed);
      const turn = hallucinated ? state.rng.intBelow(ANGLE_STEPS) : spread;
      state.projectiles.push({
        weapon: owned.id,
        kind: definition.kind,
        x: state.player.x,
        y: state.player.y - px(4),
        vx: Math.trunc((aim.x * cosStep(turn) - aim.y * sinStep(turn)) / UNIT),
        vy: Math.trunc((aim.x * sinStep(turn) + aim.y * cosStep(turn)) / UNIT),
        damage: effectiveDamage(state, stats.damage),
        pierce: stats.pierce,
        life: definition.kind === "beam" ? 50 : definition.kind === "seeker" ? 150 : 90,
        radius: px(stats.radius),
        hit: new Set(),
        hallucinated,
      });
      if (hallucinated) {
        state.events.push({ kind: "hallucinated", x: state.player.x, y: state.player.y });
      }
    }
  }
}

export function orbitPosition(state: ArenaState, owned: OwnedWeapon, index: number): { readonly x: number; readonly y: number } {
  const stats = weaponStats(owned.id, owned.level);
  const angle = Math.trunc((state.tick * WEAPONS[owned.id].speed) / 2) + Math.trunc((index * ANGLE_STEPS) / stats.count);
  const radius = px(stats.radius);
  return {
    x: state.player.x + Math.trunc((cosStep(angle) * radius) / UNIT),
    y: state.player.y + Math.trunc((sinStep(angle) * radius) / UNIT),
  };
}

function orbitHits(state: ArenaState, owned: OwnedWeapon): void {
  const stats = weaponStats(owned.id, owned.level);
  const reach = px(7);
  for (let index = 0; index < stats.count; index += 1) {
    const blade = orbitPosition(state, owned, index);
    state.grid.forEachNear(blade.x, blade.y, reach + px(20), (enemy) => {
      if (enemy.health <= 0) {
        return;
      }
      const total = reach + enemy.radius;
      if (distanceSquared(blade.x, blade.y, enemy.x, enemy.y) > total * total) {
        return;
      }
      const readyAt = owned.orbitHits.get(enemy.id) ?? 0;
      if (state.tick < readyAt) {
        return;
      }
      owned.orbitHits.set(enemy.id, state.tick + stats.cooldown);
      damageEnemy(state, enemy, effectiveDamage(state, stats.damage), owned.id);
    });
  }
  if (state.tick % 120 === 0) {
    for (const [id, readyAt] of owned.orbitHits) {
      if (readyAt < state.tick) {
        owned.orbitHits.delete(id);
      }
    }
  }
}

function pulse(state: ArenaState, weapon: WeaponId, radius: number, damage: number): void {
  state.events.push({ kind: "pulse", x: state.player.x, y: state.player.y, radius, weapon });
  state.grid.forEachNear(state.player.x, state.player.y, radius + px(20), (enemy) => {
    if (enemy.health <= 0) {
      return;
    }
    const reach = radius + enemy.radius;
    if (distanceSquared(state.player.x, state.player.y, enemy.x, enemy.y) <= reach * reach) {
      damageEnemy(state, enemy, damage, weapon);
    }
  });
}

function moveProjectiles(state: ArenaState): void {
  for (const projectile of state.projectiles) {
    if (projectile.kind === "seeker" && !projectile.hallucinated && state.tick % 4 === 0) {
      const target = nearestEnemy(state, projectile.x, projectile.y, px(160));
      if (target) {
        const speed = isqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy);
        const desired = scaleToLength(target.x - projectile.x, target.y - projectile.y, speed);
        projectile.vx = Math.trunc((projectile.vx + desired.x) / 2);
        projectile.vy = Math.trunc((projectile.vy + desired.y) / 2);
      }
    }
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;
    projectile.life -= 1;
    if (projectile.hallucinated) {
      continue;
    }
    state.grid.forEachNear(projectile.x, projectile.y, projectile.radius + px(20), (enemy) => {
      if (projectile.pierce <= 0) {
        return true;
      }
      if (enemy.health <= 0 || projectile.hit.has(enemy.id)) {
        return;
      }
      const reach = projectile.radius + enemy.radius;
      if (distanceSquared(projectile.x, projectile.y, enemy.x, enemy.y) > reach * reach) {
        return;
      }
      projectile.hit.add(enemy.id);
      projectile.pierce -= 1;
      damageEnemy(state, enemy, projectile.damage, projectile.weapon);
    });
    if (projectile.pierce <= 0) {
      projectile.life = 0;
    }
  }
}

function damageEnemy(state: ArenaState, enemy: Enemy, base: number, weapon: WeaponId): void {
  const crit = state.rng.chancePercent(critPercent(state));
  const amount = crit ? base * 2 : base;
  enemy.health -= amount;
  enemy.hitFlash = 6;
  const away = scaleToLength(enemy.x - state.player.x, enemy.y - state.player.y, enemy.kind === "boss" ? BOSS_KNOCKBACK : crit ? KNOCKBACK * 2 : KNOCKBACK);
  enemy.knockX += away.x;
  enemy.knockY += away.y;
  state.damageByWeapon.set(weapon, (state.damageByWeapon.get(weapon) ?? 0) + amount);
  state.events.push({ kind: "damage", x: enemy.x, y: enemy.y, amount, crit, boss: enemy.kind === "boss" });
  if (enemy.health > 0) {
    return;
  }
  state.kills += 1;
  state.events.push({ kind: "kill", x: enemy.x, y: enemy.y, enemy: enemy.kind });
  state.gems.push({ x: enemy.x, y: enemy.y, value: enemy.xp, pulled: false });
  if (enemy.id === state.bossId) {
    defeatBoss(state, enemy);
  }
}

function defeatBoss(state: ArenaState, boss: Enemy): void {
  state.events.push({ kind: "bossDown", world: state.bossesDown, x: boss.x, y: boss.y });
  state.bossesDown += 1;
  state.bossId = null;
  state.slam = null;
  state.pendingLevelUps += 1;
  if (state.bossesDown >= WORLDS.length) {
    move(state, "finalBossDown");
    return;
  }
  state.tier = Math.min(5, state.tier + 1) as Tier;
  state.player.health = Math.min(maxHealth(state), state.player.health + percentOf(maxHealth(state), 40));
  state.nextBossTick = Math.max(seconds(BOSS_EVERY_SECONDS * (state.bossesDown + 1)), state.tick + seconds(20));
  state.events.push({ kind: "tierUp", tier: state.tier });
}

function updateSlam(state: ArenaState): void {
  if (state.bossId === null) {
    return;
  }
  if (state.slam) {
    state.slam.ticksLeft -= 1;
    if (state.slam.ticksLeft > 0) {
      return;
    }
    const slam = state.slam;
    state.slam = null;
    state.events.push({ kind: "slam", x: slam.x, y: slam.y });
    const reach = SLAM_RADIUS + PLAYER_RADIUS;
    if (distanceSquared(slam.x, slam.y, state.player.x, state.player.y) <= reach * reach) {
      hurtPlayer(state, SLAM_DAMAGE + state.bossesDown * 4, "boss", true);
    }
    return;
  }
  state.slamTimer -= 1;
  if (state.slamTimer <= 0) {
    state.slamTimer = SLAM_EVERY;
    state.slam = { x: state.player.x, y: state.player.y, ticksLeft: SLAM_WARNING };
  }
}

function collectGems(state: ArenaState): void {
  const player = state.player;
  const radius = pickupRadius(state);
  for (const gem of state.gems) {
    const distance = distanceSquared(gem.x, gem.y, player.x, player.y);
    if (!gem.pulled && distance <= radius * radius) {
      gem.pulled = true;
    }
    if (!gem.pulled) {
      continue;
    }
    const pull = scaleToLength(player.x - gem.x, player.y - gem.y, px(4));
    gem.x += pull.x;
    gem.y += pull.y;
    if (distanceSquared(gem.x, gem.y, player.x, player.y) <= px(6) * px(6)) {
      gem.pulled = false;
      gem.x = Number.NaN;
      gainXp(state, gem.value);
    }
  }
}

function gainXp(state: ArenaState, amount: number): void {
  state.xp += amount;
  while (state.xp >= xpToNext(state.level)) {
    state.xp -= xpToNext(state.level);
    state.level += 1;
    state.pendingLevelUps += 1;
  }
}

function touchPlayer(state: ArenaState): void {
  const player = state.player;
  if (player.invulnerable > 0 || player.dashTicks > 0) {
    return;
  }
  const found: { enemy: Enemy | null } = { enemy: null };
  state.grid.forEachNear(player.x, player.y, PLAYER_RADIUS + px(20), (enemy) => {
    const reach = enemy.radius + PLAYER_RADIUS;
    if (enemy.health > 0 && distanceSquared(enemy.x, enemy.y, player.x, player.y) <= reach * reach) {
      found.enemy = enemy;
      return true;
    }
    return false;
  });
  const hit = found.enemy;
  if (hit !== null) {
    hurtPlayer(state, hit.damage, hit.kind, false);
  }
}

function hurtPlayer(state: ArenaState, base: number, source: EnemyKind, ignoreInvulnerable: boolean): void {
  const player = state.player;
  if (!canMove(state, "died") || (!ignoreInvulnerable && player.invulnerable > 0)) {
    return;
  }
  const amount = Math.max(1, base - statTotal(state, "armor"));
  player.health -= amount;
  player.invulnerable = HURT_INVULNERABLE;
  state.events.push({ kind: "hurt", amount });
  if (player.health <= 0) {
    player.health = 0;
    state.killedBy = { world: currentWorld(state).id, enemy: source };
    move(state, "died");
  }
}

function removeDead(state: ArenaState): void {
  const player = state.player;
  const keepEnemy = (enemy: Enemy) =>
    enemy.health > 0 && (enemy.kind === "boss" || distanceSquared(enemy.x, enemy.y, player.x, player.y) < DESPAWN_DISTANCE * DESPAWN_DISTANCE);
  filterInPlace(state.enemies, keepEnemy);
  filterInPlace(state.projectiles, (projectile) => projectile.life > 0);
  filterInPlace(state.gems, (gem) => !Number.isNaN(gem.x));
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

function openLevelUp(state: ArenaState): void {
  state.pendingLevelUps -= 1;
  state.cards = offerCards(state);
  if (state.cards.length === 0) {
    state.player.health = Math.min(maxHealth(state), state.player.health + 20);
    return;
  }
  move(state, "levelUpOpened");
  state.events.push({ kind: "levelUp", level: state.level });
}

export function choose(state: ArenaState, index: number): void {
  const card = state.cards[index];
  if (state.status !== "levelUp" || !card) {
    return;
  }
  applyCard(state, card);
  closeLevelUp(state);
}

export function reroll(state: ArenaState): void {
  if (state.status !== "levelUp" || state.rerolls <= 0) {
    return;
  }
  state.rerolls -= 1;
  state.cards = offerCards(state);
}

export function skip(state: ArenaState): void {
  if (state.status !== "levelUp" || state.skips <= 0) {
    return;
  }
  state.skips -= 1;
  closeLevelUp(state);
}

function closeLevelUp(state: ArenaState): void {
  state.cards = [];
  move(state, "cardTaken");
  if (state.pendingLevelUps > 0) {
    openLevelUp(state);
  }
}

function applyCard(state: ArenaState, card: Card): void {
  if (card.kind === "weapon") {
    const owned = state.weapons.find((weapon) => weapon.id === card.id);
    if (owned) {
      owned.level += 1;
    } else {
      state.weapons.push({ id: card.id, level: 1, cooldown: 10, orbitHits: new Map() });
    }
    return;
  }
  if (card.kind === "passive") {
    const before = maxHealth(state);
    state.passives.set(card.id, passiveLevel(state, card.id) + 1);
    state.player.health += Math.max(0, maxHealth(state) - before);
    return;
  }
  const evolution = EVOLUTIONS.find((candidate) => candidate.result === card.id);
  const index = state.weapons.findIndex((weapon) => weapon.id === evolution?.weapon);
  if (evolution && index >= 0) {
    state.weapons[index] = { id: evolution.result, level: 1, cooldown: 10, orbitHits: new Map() };
  }
}

export function score(state: ArenaState): number {
  return state.kills * 10 + state.level * 100 + state.bossesDown * 1000 + Math.trunc(state.tick / TICKS_PER_SECOND);
}

export function elapsedSeconds(state: ArenaState): number {
  return Math.trunc(state.tick / TICKS_PER_SECOND);
}

export function worldPixels(value: number): number {
  return value / SUB;
}
