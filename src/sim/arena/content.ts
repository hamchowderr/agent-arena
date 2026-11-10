import type { Tier } from "../tiers";

export type WeaponKind = "bolt" | "beam" | "orbit" | "pulse" | "seeker";

export interface WeaponLevel {
  readonly damage: number;
  readonly cooldown: number;
  readonly count: number;
  readonly pierce: number;
  readonly radius: number;
}

export interface WeaponDefinition {
  readonly kind: WeaponKind;
  readonly tier: Tier;
  readonly speed: number;
  readonly levels: readonly WeaponLevel[];
  readonly evolved?: true;
  readonly knockback?: number;
}

const level = (damage: number, cooldown: number, count: number, pierce: number, radius: number): WeaponLevel => ({
  damage,
  cooldown,
  count,
  pierce,
  radius,
});

export const WEAPONS = {
  prompt: {
    kind: "bolt",
    tier: 1,
    speed: 4,
    levels: [level(10, 32, 1, 1, 3), level(12, 30, 1, 1, 3), level(14, 28, 2, 1, 3), level(17, 26, 2, 2, 3), level(20, 22, 3, 2, 4)],
  },
  webSearch: {
    kind: "beam",
    tier: 1,
    speed: 6,
    levels: [level(14, 90, 1, 4, 3), level(17, 84, 1, 5, 3), level(20, 78, 2, 6, 3), level(24, 72, 2, 7, 4), level(28, 64, 3, 8, 4)],
  },
  codeExec: {
    kind: "orbit",
    tier: 1,
    speed: 3,
    knockback: 110,
    levels: [level(8, 18, 1, 99, 26), level(10, 18, 2, 99, 28), level(12, 16, 2, 99, 30), level(14, 16, 3, 99, 32), level(16, 14, 4, 99, 34)],
  },
  shell: {
    kind: "pulse",
    tier: 2,
    speed: 0,
    levels: [level(12, 100, 1, 99, 36), level(15, 94, 1, 99, 40), level(18, 88, 1, 99, 44), level(22, 80, 1, 99, 48), level(26, 72, 1, 99, 54)],
  },
  subagents: {
    kind: "seeker",
    tier: 3,
    speed: 3,
    levels: [level(12, 70, 2, 1, 3), level(14, 66, 2, 1, 3), level(16, 62, 3, 1, 3), level(19, 58, 3, 2, 3), level(22, 52, 4, 2, 4)],
  },
  ragSearch: {
    kind: "beam",
    tier: 1,
    speed: 7,
    evolved: true,
    levels: [level(40, 50, 4, 99, 5)],
  },
  codeInterpreter: {
    kind: "orbit",
    tier: 1,
    speed: 5,
    evolved: true,
    knockback: 140,
    levels: [level(24, 10, 6, 99, 40)],
  },
  ciPipeline: {
    kind: "pulse",
    tier: 2,
    speed: 0,
    evolved: true,
    levels: [level(45, 45, 1, 99, 72)],
  },
} as const satisfies Readonly<Record<string, WeaponDefinition>>;

export type WeaponId = keyof typeof WEAPONS;

export type PassiveStat = "maxHealth" | "damage" | "crit" | "hallucination" | "cooldown" | "pickup" | "speed" | "regen" | "armor";

export interface PassiveDefinition {
  readonly stat: PassiveStat;
  readonly perLevel: number;
  readonly tier: Tier;
  readonly maxLevel: number;
}

export const PASSIVES = {
  longContext: { stat: "maxHealth", perLevel: 20, tier: 1, maxLevel: 5 },
  fewShot: { stat: "damage", perLevel: 10, tier: 1, maxLevel: 5 },
  hotTemperature: { stat: "crit", perLevel: 6, tier: 1, maxLevel: 5 },
  guardrails: { stat: "hallucination", perLevel: -6, tier: 2, maxLevel: 5 },
  planner: { stat: "cooldown", perLevel: -7, tier: 3, maxLevel: 5 },
  vectorMemory: { stat: "pickup", perLevel: 25, tier: 1, maxLevel: 5 },
  loopRunner: { stat: "speed", perLevel: 8, tier: 1, maxLevel: 5 },
  sandbox: { stat: "regen", perLevel: 1, tier: 2, maxLevel: 5 },
  autoTestHook: { stat: "armor", perLevel: 1, tier: 3, maxLevel: 5 },
} as const satisfies Readonly<Record<string, PassiveDefinition>>;

export type PassiveId = keyof typeof PASSIVES;

export interface Evolution {
  readonly weapon: WeaponId;
  readonly passive: PassiveId;
  readonly result: WeaponId;
}

export const EVOLUTIONS: readonly Evolution[] = [
  { weapon: "webSearch", passive: "vectorMemory", result: "ragSearch" },
  { weapon: "codeExec", passive: "sandbox", result: "codeInterpreter" },
  { weapon: "shell", passive: "autoTestHook", result: "ciPipeline" },
];

export const REGULAR_KINDS = ["grunt", "runner", "charger", "shooter", "exploder", "splitter", "brute", "heavy", "lootRunner"] as const;
export type RegularKind = (typeof REGULAR_KINDS)[number];
export type EnemyKind = RegularKind | "boss";

export type EnemyBehavior = "chase" | "charge" | "shoot" | "explode" | "flee";

export interface EnemyDefinition {
  readonly health: number;
  readonly speed: number;
  readonly damage: number;
  readonly radius: number;
  readonly xp: number;
  readonly mass: number;
  readonly behavior: EnemyBehavior;
}

export const ENEMIES: Readonly<Record<EnemyKind, EnemyDefinition>> = {
  grunt: { health: 9, speed: 8, damage: 4, radius: 6, xp: 1, mass: 0, behavior: "chase" },
  runner: { health: 6, speed: 14, damage: 4, radius: 5, xp: 1, mass: 0, behavior: "chase" },
  charger: { health: 20, speed: 6, damage: 6, radius: 7, xp: 2, mass: 20, behavior: "charge" },
  shooter: { health: 22, speed: 7, damage: 5, radius: 7, xp: 3, mass: 20, behavior: "shoot" },
  exploder: { health: 26, speed: 11, damage: 6, radius: 7, xp: 3, mass: 10, behavior: "explode" },
  splitter: { health: 16, speed: 8, damage: 5, radius: 8, xp: 2, mass: 20, behavior: "chase" },
  brute: { health: 60, speed: 6, damage: 9, radius: 9, xp: 6, mass: 50, behavior: "chase" },
  heavy: { health: 100, speed: 5, damage: 8, radius: 12, xp: 12, mass: 80, behavior: "chase" },
  lootRunner: { health: 120, speed: 12, damage: 0, radius: 7, xp: 0, mass: 30, behavior: "flee" },
  boss: { health: 0, speed: 11, damage: 18, radius: 18, xp: 40, mass: 100, behavior: "chase" },
};

export const SPLIT_INTO: RegularKind = "grunt";
export const SPLIT_COUNT = 2;

export type TierSlots = readonly [RegularKind, RegularKind, RegularKind, RegularKind, RegularKind];

export interface WaveRow {
  readonly fromSecond: number;
  readonly weights: readonly [number, number, number, number, number];
  readonly interval: number;
  readonly batch: number;
}

export const WAVES: readonly WaveRow[] = [
  { fromSecond: 0, weights: [8, 1, 0, 0, 0], interval: 45, batch: 2 },
  { fromSecond: 30, weights: [5, 2, 1, 0, 0], interval: 39, batch: 3 },
  { fromSecond: 60, weights: [3, 2, 2, 1, 0], interval: 33, batch: 4 },
  { fromSecond: 90, weights: [3, 2, 2, 1, 1], interval: 27, batch: 5 },
];

export const LOOT_RUNNER_SECOND = 45;
export const ELITE_SECOND = 60;
export const ELITE_SLOT = 3;
export const LOOT_RUNNER_ESCAPE_SECONDS = 20;

export type WorldId = "hustlr" | "notionally" | "meterly" | "synergex" | "trustMe";

export type BossPattern = "spread" | "trail" | "charge" | "bursts" | "fakes";

export type BossCheck = { readonly kind: "passive"; readonly passive: PassiveId } | { readonly kind: "weapons"; readonly count: number };

export interface World {
  readonly id: WorldId;
  readonly tier: Tier;
  readonly bossHealth: number;
  readonly pattern: BossPattern;
  readonly check: BossCheck;
  readonly slots: TierSlots;
  readonly minAlive: number;
  readonly maxAlive: number;
  readonly maxShooters: number;
}

export const WORLDS: readonly World[] = [
  { id: "hustlr", tier: 1, bossHealth: 700, pattern: "spread", check: { kind: "passive", passive: "fewShot" }, slots: ["grunt", "runner", "shooter", "splitter", "heavy"], minAlive: 20, maxAlive: 260, maxShooters: 2 },
  { id: "notionally", tier: 2, bossHealth: 1600, pattern: "trail", check: { kind: "passive", passive: "vectorMemory" }, slots: ["grunt", "splitter", "runner", "brute", "heavy"], minAlive: 60, maxAlive: 300, maxShooters: 2 },
  { id: "meterly", tier: 3, bossHealth: 3200, pattern: "charge", check: { kind: "weapons", count: 2 }, slots: ["grunt", "charger", "exploder", "brute", "heavy"], minAlive: 90, maxAlive: 340, maxShooters: 4 },
  { id: "synergex", tier: 4, bossHealth: 5600, pattern: "bursts", check: { kind: "passive", passive: "planner" }, slots: ["grunt", "runner", "splitter", "brute", "heavy"], minAlive: 120, maxAlive: 380, maxShooters: 4 },
  { id: "trustMe", tier: 5, bossHealth: 9000, pattern: "fakes", check: { kind: "passive", passive: "guardrails" }, slots: ["grunt", "splitter", "shooter", "brute", "heavy"], minAlive: 150, maxAlive: 420, maxShooters: 6 },
];

export const BOSS_PHASE_FLOORS = [60, 30, 0] as const;
export const ACQUISITION_SECONDS = 60;

export const BOSS_EVERY_SECONDS = 120;
export const MAX_WEAPONS = 5;
export const MAX_PASSIVES = 5;

export function isEvolvedWeapon(id: WeaponId): boolean {
  const definition: WeaponDefinition = WEAPONS[id];
  return definition.evolved === true;
}
