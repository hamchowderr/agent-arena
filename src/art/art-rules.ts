import type { EnemyKind } from "../sim/arena/content";

export type ArtTier = "fodder" | "mid" | "heavy" | "boss";

export interface SpanRange {
  readonly min: number;
  readonly max: number;
}

export const TIER_SPAN: Readonly<Record<ArtTier, SpanRange>> = {
  fodder: { min: 12, max: 20 },
  mid: { min: 18, max: 28 },
  heavy: { min: 26, max: 40 },
  boss: { min: 56, max: 96 },
};

export const ENEMY_ART_TIER: Readonly<Record<EnemyKind, ArtTier>> = {
  grunt: "fodder",
  runner: "fodder",
  charger: "mid",
  shooter: "mid",
  exploder: "mid",
  splitter: "mid",
  lootRunner: "mid",
  brute: "heavy",
  heavy: "heavy",
  boss: "boss",
};

export const RENDER_SCALE = { regular: 1, elite: 2, boss: 1 } as const;

export const MIN_ENEMY_COLORS = 10;
export const MAX_SPRITE_COLORS = 24;
export const MIN_HUE_GAP_IN_WORLD = 30;
export const MAX_SILHOUETTE_OVERLAP = 0.8;
export const MIN_GROUND_CONTRAST = 1.6;
export const MIN_TELEGRAPH_SECONDS = 0.8;
