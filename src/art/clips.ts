import type { RegularKind } from "../sim/arena/content";
import { deathFrames, hurtFrames, walkFrames, type DeathSheet } from "./animate";
import { eliteSprite, ENEMY_SPRITES } from "./arena-sprites";
import { shade, type ColorGrid } from "./shade";

export interface EnemyClips {
  readonly moving: readonly ColorGrid[];
  readonly death: DeathSheet;
}

export const WALK_FPS: Readonly<Record<RegularKind, number>> = {
  grunt: 9,
  runner: 12,
  charger: 10,
  shooter: 8,
  exploder: 8,
  splitter: 8,
  brute: 6,
  heavy: 6,
  lootRunner: 12,
};

export function enemyClips(kind: RegularKind, faction: string, elite: boolean): EnemyClips {
  const frames = walkFrames(ENEMY_SPRITES[kind]).map((frame) => (elite ? eliteSprite(frame) : frame));
  const walk = frames.map((frame) => shade([frame], faction));
  const rest = elite ? eliteSprite(ENEMY_SPRITES[kind]) : ENEMY_SPRITES[kind];
  return { moving: [...walk, ...hurtFrames(walk[0] ?? [])], death: deathFrames(shade([rest], faction)) };
}
