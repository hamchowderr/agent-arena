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

export type EnemyKind = "grunt" | "runner" | "brute" | "boss";

export interface EnemyDefinition {
  readonly health: number;
  readonly speed: number;
  readonly damage: number;
  readonly radius: number;
  readonly xp: number;
}

export const ENEMIES: Readonly<Record<EnemyKind, EnemyDefinition>> = {
  grunt: { health: 9, speed: 8, damage: 4, radius: 6, xp: 1 },
  runner: { health: 6, speed: 14, damage: 4, radius: 5, xp: 1 },
  brute: { health: 50, speed: 6, damage: 9, radius: 9, xp: 5 },
  boss: { health: 0, speed: 11, damage: 18, radius: 18, xp: 40 },
};

export type WorldId = "hustlr" | "notionally" | "meterly" | "synergex" | "trustMe";

export type BossPattern = "spread" | "trail" | "charge" | "bursts" | "fakes";

export type BossCheck = { readonly kind: "passive"; readonly passive: PassiveId } | { readonly kind: "weapons"; readonly count: number };

export interface World {
  readonly id: WorldId;
  readonly tier: Tier;
  readonly bossHealth: number;
  readonly pattern: BossPattern;
  readonly check: BossCheck;
}

export const WORLDS: readonly World[] = [
  { id: "hustlr", tier: 1, bossHealth: 700, pattern: "spread", check: { kind: "passive", passive: "fewShot" } },
  { id: "notionally", tier: 2, bossHealth: 1600, pattern: "trail", check: { kind: "passive", passive: "vectorMemory" } },
  { id: "meterly", tier: 3, bossHealth: 3200, pattern: "charge", check: { kind: "weapons", count: 2 } },
  { id: "synergex", tier: 4, bossHealth: 5600, pattern: "bursts", check: { kind: "passive", passive: "planner" } },
  { id: "trustMe", tier: 5, bossHealth: 9000, pattern: "fakes", check: { kind: "passive", passive: "guardrails" } },
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
