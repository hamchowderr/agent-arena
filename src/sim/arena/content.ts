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
  readonly name: string;
  readonly blurb: string;
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
    name: "Prompt",
    blurb: "Fires a prompt at the nearest rival.",
    kind: "bolt",
    tier: 1,
    speed: 4,
    levels: [level(10, 32, 1, 1, 3), level(12, 30, 1, 1, 3), level(14, 28, 2, 1, 3), level(17, 26, 2, 2, 3), level(20, 22, 3, 2, 4)],
  },
  webSearch: {
    name: "Web search",
    blurb: "A long beam that pierces a line of rivals.",
    kind: "beam",
    tier: 2,
    speed: 6,
    levels: [level(14, 90, 1, 4, 3), level(17, 84, 1, 5, 3), level(20, 78, 2, 6, 3), level(24, 72, 2, 7, 4), level(28, 64, 3, 8, 4)],
  },
  codeExec: {
    name: "Code exec",
    blurb: "Code blocks orbit you and hit what they touch.",
    kind: "orbit",
    tier: 2,
    speed: 3,
    levels: [level(8, 18, 1, 99, 26), level(10, 18, 2, 99, 28), level(12, 16, 2, 99, 30), level(14, 16, 3, 99, 32), level(16, 14, 4, 99, 34)],
  },
  shell: {
    name: "Shell",
    blurb: "A pulse around you damages every rival in range.",
    kind: "pulse",
    tier: 3,
    speed: 0,
    levels: [level(12, 100, 1, 99, 36), level(15, 94, 1, 99, 40), level(18, 88, 1, 99, 44), level(22, 80, 1, 99, 48), level(26, 72, 1, 99, 54)],
  },
  subagents: {
    name: "Subagents",
    blurb: "Small agents seek out rivals on their own.",
    kind: "seeker",
    tier: 4,
    speed: 3,
    levels: [level(12, 70, 2, 1, 3), level(14, 66, 2, 1, 3), level(16, 62, 3, 1, 3), level(19, 58, 3, 2, 3), level(22, 52, 4, 2, 4)],
  },
  ragSearch: {
    name: "RAG",
    blurb: "Grounded beams that pierce everything in their path.",
    kind: "beam",
    tier: 2,
    speed: 7,
    evolved: true,
    levels: [level(40, 50, 4, 99, 5)],
  },
  codeInterpreter: {
    name: "Code interpreter",
    blurb: "A ring of sandboxed code that shreds anything close.",
    kind: "orbit",
    tier: 2,
    speed: 5,
    evolved: true,
    levels: [level(24, 10, 6, 99, 40)],
  },
  ciPipeline: {
    name: "CI pipeline",
    blurb: "Every push runs the suite: huge, fast pulses.",
    kind: "pulse",
    tier: 3,
    speed: 0,
    evolved: true,
    levels: [level(45, 45, 1, 99, 72)],
  },
} as const satisfies Readonly<Record<string, WeaponDefinition>>;

export type WeaponId = keyof typeof WEAPONS;

export type PassiveStat = "maxHealth" | "damage" | "crit" | "hallucination" | "cooldown" | "pickup" | "speed" | "regen" | "armor";

export interface PassiveDefinition {
  readonly name: string;
  readonly blurb: string;
  readonly stat: PassiveStat;
  readonly perLevel: number;
  readonly tier: Tier;
  readonly maxLevel: number;
}

export const PASSIVES = {
  longContext: { name: "Long context", blurb: "More room before you run out.", stat: "maxHealth", perLevel: 20, tier: 1, maxLevel: 5 },
  fewShot: { name: "Few-shot examples", blurb: "Every weapon hits harder.", stat: "damage", perLevel: 10, tier: 1, maxLevel: 5 },
  hotTemperature: { name: "Temperature 1.2", blurb: "More critical hits.", stat: "crit", perLevel: 6, tier: 1, maxLevel: 5 },
  guardrails: { name: "Guardrails", blurb: "Fewer hallucinated shots.", stat: "hallucination", perLevel: -6, tier: 2, maxLevel: 5 },
  planner: { name: "Planner", blurb: "Weapons fire more often.", stat: "cooldown", perLevel: -7, tier: 3, maxLevel: 5 },
  vectorMemory: { name: "Vector memory", blurb: "Pull in tokens from farther away.", stat: "pickup", perLevel: 25, tier: 2, maxLevel: 5 },
  loopRunner: { name: "Loop runner", blurb: "Move faster.", stat: "speed", perLevel: 8, tier: 1, maxLevel: 5 },
  sandbox: { name: "Sandbox", blurb: "Slowly recover health.", stat: "regen", perLevel: 1, tier: 3, maxLevel: 5 },
  autoTestHook: { name: "Auto-test hook", blurb: "Take less damage from every hit.", stat: "armor", perLevel: 1, tier: 4, maxLevel: 5 },
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
  boss: { health: 0, speed: 7, damage: 18, radius: 18, xp: 40 },
};

export interface World {
  readonly tier: Tier;
  readonly rival: string;
  readonly boss: string;
  readonly pitch: string;
  readonly bossHealth: number;
}

export const WORLDS: readonly World[] = [
  { tier: 1, rival: "Hustlr", boss: "The Closer", pitch: "Why build an agent? Rent ours by the seat.", bossHealth: 700 },
  { tier: 2, rival: "Notionally", boss: "The Workspace", pitch: "Your memory lives in our cloud now.", bossHealth: 1600 },
  { tier: 3, rival: "Meterly", boss: "The Meter", pitch: "Every tool call is billed. Per call.", bossHealth: 3200 },
  { tier: 4, rival: "Synergex", boss: "The Synergy", pitch: "Our planner plans for you. Forever.", bossHealth: 5600 },
  { tier: 5, rival: "TrustMe.ai", boss: "The Oracle", pitch: "No sources needed. Just trust me.", bossHealth: 9000 },
];

export const BOSS_EVERY_SECONDS = 120;
export const MAX_WEAPONS = 5;
export const MAX_PASSIVES = 5;
