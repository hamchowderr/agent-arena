import { createRng, mixSeed, type Rng } from "../rng";
import type { Tier } from "../tiers";
import { offerCards, type Card } from "./cards";
import {
  ACQUISITION_SECONDS,
  BOSS_EVERY_SECONDS,
  BOSS_PHASE_FLOORS,
  ELITE_SECOND,
  ELITE_SLOT,
  ENEMIES,
  EVOLUTIONS,
  LOOT_RUNNER_ESCAPE_SECONDS,
  LOOT_RUNNER_SECOND,
  SPLIT_COUNT,
  SPLIT_INTO,
  WAVES,
  PASSIVES,
  WEAPONS,
  WORLDS,
  type BossPattern,
  type EnemyKind,
  type RegularKind,
  type WaveRow,
  type WorldId,
  type PassiveId,
  type PassiveStat,
  type WeaponDefinition,
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
export const BASE_HALLUCINATION = 20;
export const HALLUCINATION_VEER = 40;
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
export const BOSS_PHASE_TRANSITION = seconds(1);
export const SHOT_RADIUS = px(4);
const SHOT_SPEED = 22;
const BOSS_FOCUS_RANGE = px(200);
const BURST_SPEED = 20;
const SHOT_DAMAGE = 8;
const SPREAD_STEP = 10;
const MAX_SHOTS = 160;
const MAX_HAZARDS = 40;
const HAZARD_DAMAGE = 3;
const CHARGE_WINDUP = 36;
const CHARGE_SPEED = 46;
const CHARGE_TICKS = 40;
const FAKE_SHOT_PERCENT = 50;
const GROWTH_HACK_HEAL_PERCENT = 25;
const THROTTLE_PERCENT = 160;
const CONFIDENT_EXPERT_HALLUCINATION = 25;
export const ELITE_HEALTH_TIMES = 10;
export const ELITE_DAMAGE_PERCENT = 130;
export const ELITE_RADIUS_PERCENT = 170;
export const TELEGRAPH_TICKS = 48;
export const ENEMY_DASH_TICKS = 24;
export const ENEMY_DASH_TIMES = 5;
export const ENEMY_DASH_RANGE = px(110);
export const ENEMY_DASH_REST = seconds(2);
export const SHOOTER_RANGE = px(110);
export const SHOOTER_EVERY = 170;
export const ENEMY_SHOT_SPEED = 14;
export const FUSE_RANGE = px(24);
export const FUSE_TICKS = 48;
export const BLAST_RADIUS = px(28);
export const BLAST_DAMAGE = 18;
export const LOOT_GEM_EVERY_HIT = 1;
export const LOOT_PAYOUT = 12;
export const MAX_SPAWNS_PER_TICK = 1;
export const RAMP_SECONDS = 120;
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

export type EnemyMode = "move" | "telegraph" | "dash";

export interface Enemy {
  readonly id: number;
  readonly kind: EnemyKind;
  readonly elite: boolean;
  readonly mass: number;
  mode: EnemyMode;
  timer: number;
  dashX: number;
  dashY: number;
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
  readonly chest: boolean;
  readonly prizes: number;
  settle: number;
  pulled: boolean;
}

export interface OwnedWeapon {
  readonly id: WeaponId;
  level: number;
  cooldown: number;
  readonly orbitHits: Map<number, number>;
}

export type BossPhase = 1 | 2 | 3;

export interface BossFight {
  phase: BossPhase;
  transition: number;
  attackTimer: number;
  acquireTicks: number;
  windup: number;
  chargeX: number;
  chargeY: number;
  chargeTicks: number;
  volley: number;
}

export interface HostileShot {
  x: number;
  y: number;
  readonly vx: number;
  readonly vy: number;
  life: number;
  readonly damage: number;
  readonly fake: boolean;
  readonly source: EnemyKind;
}

export interface Hazard {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  life: number;
}

export interface Slam {
  readonly x: number;
  readonly y: number;
  ticksLeft: number;
}

export const HIT_FLASH_TICKS = 12;
export const GEM_SETTLE_TICKS = 30;
export const ELITE_CHEST_PRIZES = 1;
export const BOSS_CHEST_PRIZES = 3;
const GEM_SCATTER = px(10);

export type ArenaEvent =
  | { readonly kind: "damage"; readonly x: number; readonly y: number; readonly amount: number; readonly crit: boolean; readonly boss: boolean }
  | { readonly kind: "kill"; readonly x: number; readonly y: number; readonly enemy: EnemyKind; readonly elite: boolean }
  | { readonly kind: "hurt"; readonly amount: number; readonly source: EnemyKind }
  | { readonly kind: "hallucinated"; readonly x: number; readonly y: number }
  | { readonly kind: "pulse"; readonly x: number; readonly y: number; readonly radius: number; readonly weapon: WeaponId }
  | { readonly kind: "levelUp"; readonly level: number }
  | { readonly kind: "bossArrives"; readonly world: number }
  | { readonly kind: "bossDown"; readonly world: number; readonly x: number; readonly y: number }
  | { readonly kind: "tierUp"; readonly tier: Tier }
  | { readonly kind: "dash" }
  | { readonly kind: "slam"; readonly x: number; readonly y: number }
  | { readonly kind: "bossPhase"; readonly phase: BossPhase; readonly checkPassed: boolean }
  | { readonly kind: "bossHealed"; readonly x: number; readonly y: number; readonly amount: number }
  | { readonly kind: "acquired" }
  | { readonly kind: "blast"; readonly x: number; readonly y: number; readonly radius: number }
  | { readonly kind: "eliteArrives"; readonly x: number; readonly y: number }
  | { readonly kind: "chest"; readonly x: number; readonly y: number; readonly prize: Card | null; readonly reel: readonly Card[] }
  | { readonly kind: "lootEscaped" };

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
  fight: BossFight | null;
  readonly shots: HostileShot[];
  readonly hazards: Hazard[];
  spawnCarry: number;
  worldStartTick: number;
  eliteSpawned: boolean;
  lootSpawned: boolean;
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
    fight: null,
    shots: [],
    hazards: [],
    spawnCarry: 0,
    worldStartTick: 0,
    eliteSpawned: false,
    lootSpawned: false,
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
  const doubt = bossPenalty(state, "fakes") ? CONFIDENT_EXPERT_HALLUCINATION : 0;
  return Math.max(0, BASE_HALLUCINATION - HALLUCINATION_PER_TIER * (state.tier - 1) + statTotal(state, "hallucination") + doubt);
}

export function bossCheckPassed(state: ArenaState): boolean {
  const check = currentWorld(state).check;
  return check.kind === "passive" ? (state.passives.get(check.passive) ?? 0) > 0 : state.weapons.length >= check.count;
}

export function bossPenalty(state: ArenaState, pattern: BossPattern): boolean {
  return state.fight !== null && state.fight.phase >= 2 && currentWorld(state).pattern === pattern && !bossCheckPassed(state);
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
  updateBossFight(state);
  moveShots(state);
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
  const slowed = bossPenalty(state, "trail") && inHazard(state, player.x, player.y);
  const velocity = scaleToLength(input.moveX, input.moveY, slowed ? Math.trunc(playerSpeed(state) / 2) : playerSpeed(state));
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

export function worldSeconds(state: ArenaState): number {
  return Math.trunc((state.tick - state.worldStartTick) / TICKS_PER_SECOND);
}

export function currentWave(state: ArenaState): WaveRow {
  const elapsed = worldSeconds(state);
  let row = WAVES[0] as WaveRow;
  for (const candidate of WAVES) {
    if (candidate.fromSecond <= elapsed) {
      row = candidate;
    }
  }
  return row;
}

function regularsAlive(state: ArenaState): number {
  return state.enemies.length - (state.bossId === null ? 0 : 1);
}

function pickSlot(state: ArenaState, row: WaveRow): RegularKind {
  const world = currentWorld(state);
  const total = row.weights.reduce((sum, weight) => sum + weight, 0);
  let roll = state.rng.intBelow(total);
  for (let slot = 0; slot < row.weights.length; slot += 1) {
    roll -= row.weights[slot] ?? 0;
    if (roll < 0) {
      const kind = world.slots[slot] ?? world.slots[0];
      const shooters = state.enemies.filter((enemy) => enemy.kind === "shooter").length;
      return kind === "shooter" && shooters >= world.maxShooters ? world.slots[0] : kind;
    }
  }
  return world.slots[0];
}

function spawnEnemies(state: ArenaState): void {
  const world = currentWorld(state);
  const ramp = Math.min(RAMP_SECONDS, worldSeconds(state));
  const full = world.minAlive + Math.trunc(((world.maxAlive - world.minAlive) * ramp) / RAMP_SECONDS);
  const ceiling = state.bossId === null ? full : Math.trunc(full / 2);
  const floor = world.minAlive;
  if (state.bossId === null) {
    spawnSpecials(state);
  }
  const row = currentWave(state);
  const elapsed = state.tick - state.worldStartTick;
  let wanted = elapsed % row.interval === 0 ? row.batch : 0;
  if (state.bossId === null && regularsAlive(state) < floor) {
    wanted = Math.max(wanted, Math.min(MAX_SPAWNS_PER_TICK, floor - regularsAlive(state)));
  }
  for (let index = 0; index < wanted && regularsAlive(state) < Math.min(ceiling, MAX_ENEMIES); index += 1) {
    spawnEnemy(state, pickSlot(state, row), state.rng.intBelow(ANGLE_STEPS), SPAWN_DISTANCE, false);
  }
}

function spawnSpecials(state: ArenaState): void {
  const elapsed = worldSeconds(state);
  if (!state.lootSpawned && elapsed >= LOOT_RUNNER_SECOND) {
    state.lootSpawned = true;
    const runner = spawnEnemy(state, "lootRunner", state.rng.intBelow(ANGLE_STEPS), px(140), false);
    runner.timer = seconds(LOOT_RUNNER_ESCAPE_SECONDS);
  }
  if (!state.eliteSpawned && elapsed >= ELITE_SECOND) {
    state.eliteSpawned = true;
    const kind = currentWorld(state).slots[ELITE_SLOT] ?? "brute";
    const elite = spawnEnemy(state, kind, state.rng.intBelow(ANGLE_STEPS), SPAWN_DISTANCE - px(60), true);
    state.events.push({ kind: "eliteArrives", x: elite.x, y: elite.y });
  }
}

function healthScale(state: ArenaState): number {
  const seconds = Math.trunc(state.tick / TICKS_PER_SECOND);
  return 100 + Math.trunc(seconds / 2) + state.bossesDown * 60;
}

function spawnEnemy(state: ArenaState, kind: EnemyKind, angle: number, distance: number, elite: boolean): Enemy {
  return spawnEnemyAt(
    state,
    kind,
    state.player.x + Math.trunc((cosStep(angle) * distance) / UNIT),
    state.player.y + Math.trunc((sinStep(angle) * distance) / UNIT),
    elite,
  );
}

function spawnEnemyAt(state: ArenaState, kind: EnemyKind, x: number, y: number, elite: boolean): Enemy {
  const definition = ENEMIES[kind];
  const scaled = kind === "boss" ? (WORLDS[state.bossesDown]?.bossHealth ?? 9000) : percentOf(definition.health, healthScale(state));
  const health = elite ? scaled * ELITE_HEALTH_TIMES : scaled;
  const damage = definition.damage === 0 ? 0 : definition.damage + state.bossesDown * 3 + Math.trunc(state.tick / (TICKS_PER_SECOND * 60));
  const enemy: Enemy = {
    id: state.nextId,
    kind,
    elite,
    mass: elite ? Math.max(definition.mass, 80) : definition.mass,
    mode: "move",
    timer: kind === "shooter" ? SHOOTER_EVERY : 0,
    dashX: 0,
    dashY: 0,
    x,
    y,
    health,
    maxHealth: health,
    hitFlash: 0,
    knockX: 0,
    knockY: 0,
    speed: definition.speed,
    damage: elite ? percentOf(damage, ELITE_DAMAGE_PERCENT) : damage,
    radius: px(elite ? percentOf(definition.radius, ELITE_RADIUS_PERCENT) : definition.radius),
    xp: elite ? definition.xp * 10 : definition.xp,
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
  const boss = spawnEnemy(state, "boss", angle, BOSS_ENTRY_DISTANCE, false);
  state.bossId = boss.id;
  state.slamTimer = SLAM_EVERY;
  state.fight = {
    phase: 1,
    transition: 0,
    attackTimer: seconds(2),
    acquireTicks: seconds(ACQUISITION_SECONDS),
    windup: 0,
    chargeX: 0,
    chargeY: 0,
    chargeTicks: 0,
    volley: 0,
  };
  state.events.push({ kind: "bossArrives", world: state.bossesDown });
}

function moveEnemies(state: ArenaState): void {
  state.grid.rebuild(state.enemies);
  for (const enemy of state.enemies) {
    if (enemy.hitFlash > 0) {
      enemy.hitFlash -= 1;
    }
    const charging = enemy.id === state.bossId && state.fight !== null && state.fight.chargeTicks > 0 ? state.fight : null;
    const toward = charging
      ? { x: charging.chargeX, y: charging.chargeY }
      : state.fight !== null && enemy.id === state.bossId && state.fight.windup > 0
        ? { x: 0, y: 0 }
        : enemyStep(state, enemy);
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
    const limit = Math.max(1, Math.trunc((10 * (100 - enemy.mass)) / 100));
    enemy.x += toward.x + Math.max(-limit, Math.min(limit, pushX)) + enemy.knockX;
    enemy.y += toward.y + Math.max(-limit, Math.min(limit, pushY)) + enemy.knockY;
    enemy.knockX = Math.trunc((enemy.knockX * KNOCKBACK_KEEP_PERCENT) / 100);
    enemy.knockY = Math.trunc((enemy.knockY * KNOCKBACK_KEEP_PERCENT) / 100);
  }
  state.grid.rebuild(state.enemies);
}

function enemyStep(state: ArenaState, enemy: Enemy): { readonly x: number; readonly y: number } {
  const player = state.player;
  const chase = () => scaleToLength(player.x - enemy.x, player.y - enemy.y, enemy.speed);
  const near = (range: number) => distanceSquared(enemy.x, enemy.y, player.x, player.y) <= range * range;
  if (enemy.kind === "boss") {
    return chase();
  }
  if (enemy.timer > 0) {
    enemy.timer -= 1;
  }
  switch (ENEMIES[enemy.kind].behavior) {
    case "chase":
      return chase();
    case "flee":
      if (enemy.timer <= 0) {
        enemy.health = 0;
        state.events.push({ kind: "lootEscaped" });
        return { x: 0, y: 0 };
      }
      return scaleToLength(enemy.x - player.x, enemy.y - player.y, enemy.speed);
    case "charge":
      if (enemy.mode === "dash") {
        if (enemy.timer <= 0) {
          enemy.mode = "move";
          enemy.timer = ENEMY_DASH_REST;
        }
        return { x: enemy.dashX, y: enemy.dashY };
      }
      if (enemy.mode === "telegraph") {
        if (enemy.timer <= 0) {
          enemy.mode = "dash";
          enemy.timer = ENEMY_DASH_TICKS;
        }
        return { x: 0, y: 0 };
      }
      if (enemy.timer <= 0 && near(ENEMY_DASH_RANGE)) {
        const dash = scaleToLength(player.x - enemy.x, player.y - enemy.y, enemy.speed * ENEMY_DASH_TIMES);
        enemy.dashX = dash.x;
        enemy.dashY = dash.y;
        enemy.mode = "telegraph";
        enemy.timer = TELEGRAPH_TICKS;
        return { x: 0, y: 0 };
      }
      return chase();
    case "shoot":
      if (enemy.mode === "telegraph") {
        if (enemy.timer <= 0) {
          fireShot(state, enemy, { x: enemy.dashX, y: enemy.dashY }, false);
          enemy.mode = "move";
          enemy.timer = SHOOTER_EVERY;
        }
        return { x: 0, y: 0 };
      }
      if (near(SHOOTER_RANGE)) {
        if (enemy.timer <= 0) {
          const aim = scaleToLength(player.x - enemy.x, player.y - enemy.y, ENEMY_SHOT_SPEED);
          enemy.dashX = aim.x;
          enemy.dashY = aim.y;
          enemy.mode = "telegraph";
          enemy.timer = TELEGRAPH_TICKS;
        }
        return { x: 0, y: 0 };
      }
      return chase();
    case "explode":
      if (enemy.mode === "telegraph") {
        if (enemy.timer <= 0) {
          explode(state, enemy);
          return { x: 0, y: 0 };
        }
        return scaleToLength(player.x - enemy.x, player.y - enemy.y, Math.trunc(enemy.speed / 3));
      }
      if (near(FUSE_RANGE)) {
        enemy.mode = "telegraph";
        enemy.timer = FUSE_TICKS;
      }
      return chase();
  }
}

function explode(state: ArenaState, enemy: Enemy): void {
  enemy.health = 0;
  state.events.push({ kind: "blast", x: enemy.x, y: enemy.y, radius: BLAST_RADIUS });
  const player = state.player;
  const reach = BLAST_RADIUS + PLAYER_RADIUS;
  if (player.dashTicks === 0 && distanceSquared(enemy.x, enemy.y, player.x, player.y) <= reach * reach) {
    hurtPlayer(state, BLAST_DAMAGE + state.bossesDown * 3, "exploder", true);
  }
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
    if (bossPenalty(state, "charge")) {
      owned.cooldown = percentOf(owned.cooldown, THROTTLE_PERCENT);
    }
    if (definition.kind === "pulse") {
      pulse(state, owned.id, px(stats.radius), effectiveDamage(state, stats.damage));
      continue;
    }
    const target = bossInReach(state, BOSS_FOCUS_RANGE) ?? nearestEnemy(state, state.player.x, state.player.y, px(260));
    if (!target) {
      owned.cooldown = 4;
      continue;
    }
    for (let shot = 0; shot < stats.count; shot += 1) {
      const hallucinated = state.rng.chancePercent(hallucinationPercent(state));
      const spread = (shot - Math.trunc(stats.count / 2)) * 10;
      const speed = px(definition.speed);
      const aim = scaleToLength(target.x - state.player.x, target.y - state.player.y, speed);
      const turn = hallucinated ? spread + state.rng.intBelow(HALLUCINATION_VEER * 2 + 1) - HALLUCINATION_VEER : spread;
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
  const fight = enemy.id === state.bossId ? state.fight : null;
  if (fight && fight.transition > 0) {
    return;
  }
  const crit = state.rng.chancePercent(critPercent(state));
  const amount = crit ? base * 2 : base;
  if (fight && bossPenalty(state, "spread") && state.rng.chancePercent(GROWTH_HACK_HEAL_PERCENT)) {
    const healed = Math.min(amount, enemy.maxHealth - enemy.health);
    enemy.health += healed;
    state.events.push({ kind: "bossHealed", x: enemy.x, y: enemy.y, amount: healed });
    return;
  }
  enemy.health -= amount;
  if (fight && fight.phase < 3) {
    const floor = Math.trunc((enemy.maxHealth * (BOSS_PHASE_FLOORS[fight.phase - 1] ?? 0)) / 100);
    if (enemy.health <= floor) {
      enemy.health = floor;
      advanceBossPhase(state, fight);
    }
  }
  enemy.hitFlash = HIT_FLASH_TICKS;
  const definition: WeaponDefinition = WEAPONS[weapon];
  const shove = definition.knockback ?? KNOCKBACK;
  const push = enemy.kind === "boss" ? BOSS_KNOCKBACK : Math.trunc(((crit ? shove * 2 : shove) * (100 - enemy.mass)) / 100);
  const away = scaleToLength(enemy.x - state.player.x, enemy.y - state.player.y, push);
  enemy.knockX += away.x;
  enemy.knockY += away.y;
  state.damageByWeapon.set(weapon, (state.damageByWeapon.get(weapon) ?? 0) + amount);
  state.events.push({ kind: "damage", x: enemy.x, y: enemy.y, amount, crit, boss: enemy.kind === "boss" });
  if (enemy.kind === "lootRunner") {
    dropGem(state, enemy, LOOT_GEM_EVERY_HIT, 0);
  }
  if (enemy.health > 0) {
    return;
  }
  defeatEnemy(state, enemy);
}

function defeatEnemy(state: ArenaState, enemy: Enemy): void {
  state.kills += 1;
  state.events.push({ kind: "kill", x: enemy.x, y: enemy.y, enemy: enemy.kind, elite: enemy.elite });
  const prizes = enemy.id === state.bossId ? BOSS_CHEST_PRIZES : enemy.elite ? ELITE_CHEST_PRIZES : 0;
  if (prizes > 0) {
    dropGem(state, enemy, 0, prizes);
  }
  const value = enemy.kind === "lootRunner" ? LOOT_PAYOUT : enemy.xp;
  if (value > 0) {
    dropGem(state, enemy, value, 0);
  }
  if (enemy.kind === "splitter") {
    const away = scaleToLength(enemy.x - state.player.x, enemy.y - state.player.y, KNOCKBACK);
    for (let index = 0; index < SPLIT_COUNT; index += 1) {
      const side = index * 2 - (SPLIT_COUNT - 1);
      const child = spawnEnemyAt(state, SPLIT_INTO, enemy.x - away.y * side, enemy.y + away.x * side, false);
      child.knockX = away.x;
      child.knockY = away.y;
    }
  }
  if (enemy.id === state.bossId) {
    defeatBoss(state, enemy);
  }
}

function dropGem(state: ArenaState, enemy: Enemy, value: number, prizes: number): void {
  const angle = (enemy.id * 37 + state.gems.length * 11 + state.tick) % ANGLE_STEPS;
  const reach = prizes > 0 ? 0 : GEM_SCATTER;
  const magnet = pickupRadius(state);
  state.gems.push({
    x: enemy.x + Math.trunc((cosStep(angle) * reach) / UNIT),
    y: enemy.y + Math.trunc((sinStep(angle) * reach) / UNIT),
    value,
    chest: prizes > 0,
    prizes,
    settle: GEM_SETTLE_TICKS,
    pulled: distanceSquared(enemy.x, enemy.y, state.player.x, state.player.y) <= magnet * magnet,
  });
}

function openChest(state: ArenaState, x: number, y: number): void {
  const reel = offerCards(state);
  const prize = reel.length > 0 ? reel[state.rng.intBelow(reel.length)] ?? null : null;
  if (prize) {
    applyCard(state, prize);
  } else {
    state.player.health = Math.min(maxHealth(state), state.player.health + 20);
  }
  state.events.push({ kind: "chest", x, y, prize, reel });
}

function defeatBoss(state: ArenaState, boss: Enemy): void {
  state.events.push({ kind: "bossDown", world: state.bossesDown, x: boss.x, y: boss.y });
  state.bossesDown += 1;
  state.bossId = null;
  state.slam = null;
  state.fight = null;
  state.shots.length = 0;
  state.hazards.length = 0;
  state.pendingLevelUps += 1;
  state.worldStartTick = state.tick;
  state.eliteSpawned = false;
  state.lootSpawned = false;
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

function advanceBossPhase(state: ArenaState, fight: BossFight): void {
  fight.phase = (fight.phase + 1) as BossPhase;
  fight.transition = BOSS_PHASE_TRANSITION;
  fight.attackTimer = BOSS_PHASE_TRANSITION + seconds(1);
  fight.windup = 0;
  fight.chargeTicks = 0;
  state.shots.length = 0;
  state.events.push({ kind: "bossPhase", phase: fight.phase, checkPassed: bossCheckPassed(state) });
}

function updateBossFight(state: ArenaState): void {
  const fight = state.fight;
  const boss = fight ? state.enemies.find((enemy) => enemy.id === state.bossId) : undefined;
  if (!fight || !boss) {
    return;
  }
  if (fight.transition > 0) {
    fight.transition -= 1;
    return;
  }
  if (fight.phase === 3) {
    fight.acquireTicks -= 1;
    if (fight.acquireTicks <= 0) {
      acquirePlayer(state);
      return;
    }
  }
  if (fight.chargeTicks > 0) {
    fight.chargeTicks -= 1;
  }
  if (fight.windup > 0) {
    fight.windup -= 1;
    boss.hitFlash = 2;
    if (fight.windup === 0) {
      const dash = scaleToLength(state.player.x - boss.x, state.player.y - boss.y, CHARGE_SPEED);
      fight.chargeX = dash.x;
      fight.chargeY = dash.y;
      fight.chargeTicks = CHARGE_TICKS;
    }
  }
  fight.attackTimer -= 1;
  if (fight.attackTimer > 0) {
    return;
  }
  const pattern = currentWorld(state).pattern;
  fight.attackTimer = bossAttackInterval(state, pattern, fight.phase);
  fight.volley += 1;
  bossAttack(state, boss, fight, pattern);
}

function bossAttackInterval(state: ArenaState, pattern: BossPattern, phase: BossPhase): number {
  const intervals: Readonly<Record<BossPattern, readonly [number, number, number]>> = {
    spread: [90, 75, 45],
    trail: [18, 16, 12],
    charge: [200, 160, 100],
    bursts: [150, 120, 80],
    fakes: [50, 40, 28],
  };
  const interval = intervals[pattern][phase - 1] ?? seconds(1);
  return bossPenalty(state, "bursts") ? Math.trunc(interval / 2) : interval;
}

function bossAttack(state: ArenaState, boss: Enemy, fight: BossFight, pattern: BossPattern): void {
  const aim = (speed: number) => scaleToLength(state.player.x - boss.x, state.player.y - boss.y, speed);
  switch (pattern) {
    case "spread": {
      const count = 1 + fight.phase * 2;
      const base = aim(SHOT_SPEED);
      for (let index = 0; index < count; index += 1) {
        fireShot(state, boss, rotate(base, (index - (count - 1) / 2) * SPREAD_STEP), false);
      }
      return;
    }
    case "trail":
      if (state.hazards.length < MAX_HAZARDS) {
        state.hazards.push({ x: boss.x, y: boss.y, radius: fight.phase === 3 ? px(18) : px(13), life: seconds(5) });
      }
      return;
    case "charge":
      fight.windup = CHARGE_WINDUP;
      return;
    case "bursts": {
      const count = fight.phase === 3 ? 16 : 12;
      const offset = (fight.volley % 2) * Math.trunc(ANGLE_STEPS / count / 2);
      for (let index = 0; index < count; index += 1) {
        const angle = offset + Math.trunc((index * ANGLE_STEPS) / count);
        fireShot(state, boss, { x: Math.trunc((cosStep(angle) * BURST_SPEED) / UNIT), y: Math.trunc((sinStep(angle) * BURST_SPEED) / UNIT) }, false);
      }
      return;
    }
    case "fakes": {
      const base = aim(SHOT_SPEED);
      for (let index = -1; index <= 1; index += 1) {
        fireShot(state, boss, rotate(base, index * SPREAD_STEP), state.rng.chancePercent(FAKE_SHOT_PERCENT));
      }
      return;
    }
  }
}

function bossInReach(state: ArenaState, range: number): Enemy | null {
  if (state.fight === null || state.fight.transition > 0) {
    return null;
  }
  const boss = state.enemies.find((enemy) => enemy.id === state.bossId);
  return boss && distanceSquared(boss.x, boss.y, state.player.x, state.player.y) <= range * range ? boss : null;
}

function rotate(vector: { readonly x: number; readonly y: number }, steps: number): { x: number; y: number } {
  const angle = ((Math.trunc(steps) % ANGLE_STEPS) + ANGLE_STEPS) % ANGLE_STEPS;
  const cos = cosStep(angle);
  const sin = sinStep(angle);
  return { x: Math.trunc((vector.x * cos - vector.y * sin) / UNIT), y: Math.trunc((vector.x * sin + vector.y * cos) / UNIT) };
}

function fireShot(state: ArenaState, from: Enemy, velocity: { readonly x: number; readonly y: number }, fake: boolean): void {
  if (state.shots.length >= MAX_SHOTS) {
    return;
  }
  const damage = from.kind === "boss" ? SHOT_DAMAGE + state.bossesDown * 3 : from.damage;
  state.shots.push({ x: from.x, y: from.y, vx: velocity.x, vy: velocity.y, life: seconds(4), damage, fake, source: from.kind });
}

function moveShots(state: ArenaState): void {
  const player = state.player;
  const reach = SHOT_RADIUS + PLAYER_RADIUS;
  for (const shot of state.shots) {
    shot.x += shot.vx;
    shot.y += shot.vy;
    shot.life -= 1;
    if (shot.fake || player.dashTicks > 0 || shot.life <= 0) {
      continue;
    }
    if (distanceSquared(shot.x, shot.y, player.x, player.y) <= reach * reach) {
      shot.life = 0;
      hurtPlayer(state, shot.damage, shot.source, false);
    }
  }
  for (const hazard of state.hazards) {
    hazard.life -= 1;
  }
  if (player.dashTicks === 0 && inHazard(state, player.x, player.y)) {
    hurtPlayer(state, HAZARD_DAMAGE + state.bossesDown * 2, "boss", false);
  }
}

export function inHazard(state: ArenaState, x: number, y: number): boolean {
  return state.hazards.some((hazard) => distanceSquared(hazard.x, hazard.y, x, y) <= (hazard.radius + PLAYER_RADIUS) * (hazard.radius + PLAYER_RADIUS));
}

function acquirePlayer(state: ArenaState): void {
  if (!canMove(state, "died")) {
    return;
  }
  state.player.health = 0;
  state.killedBy = { world: currentWorld(state).id, enemy: "boss" };
  state.events.push({ kind: "acquired" });
  move(state, "died");
}

function collectGems(state: ArenaState): void {
  const player = state.player;
  const radius = pickupRadius(state);
  for (const gem of state.gems) {
    if (gem.settle > 0) {
      gem.settle -= 1;
      continue;
    }
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
      for (let prize = 0; prize < gem.prizes; prize += 1) {
        openChest(state, gem.x, gem.y);
      }
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
    if (enemy.health > 0 && enemy.damage > 0 && distanceSquared(enemy.x, enemy.y, player.x, player.y) <= reach * reach) {
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
  state.events.push({ kind: "hurt", amount, source });
  if (player.health <= 0) {
    player.health = 0;
    state.killedBy = { world: currentWorld(state).id, enemy: source };
    move(state, "died");
  }
}

function removeDead(state: ArenaState): void {
  const player = state.player;
  for (const enemy of state.enemies) {
    if (enemy.elite && distanceSquared(enemy.x, enemy.y, player.x, player.y) >= DESPAWN_DISTANCE * DESPAWN_DISTANCE) {
      const back = scaleToLength(enemy.x - player.x, enemy.y - player.y, SPAWN_DISTANCE);
      enemy.x = player.x + back.x;
      enemy.y = player.y + back.y;
    }
  }
  const keepEnemy = (enemy: Enemy) =>
    enemy.health > 0 && (enemy.kind === "boss" || enemy.elite || distanceSquared(enemy.x, enemy.y, player.x, player.y) < DESPAWN_DISTANCE * DESPAWN_DISTANCE);
  filterInPlace(state.enemies, keepEnemy);
  filterInPlace(state.projectiles, (projectile) => projectile.life > 0);
  filterInPlace(state.gems, (gem) => !Number.isNaN(gem.x));
  filterInPlace(state.shots, (shot) => shot.life > 0);
  filterInPlace(state.hazards, (hazard) => hazard.life > 0);
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
