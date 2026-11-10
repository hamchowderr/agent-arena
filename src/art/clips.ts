import type { RegularKind, WorldId } from "../sim/arena/content";
import { deathFrames, hurtFrames, squash, walkFrames, type DeathSheet } from "./animate";
import { eliteSprite, ENEMY_SPRITES } from "./arena-sprites";
import { bossSprite } from "./bosses";
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

export const BOSS_CLIP_START = { idle: 0, windup: 4, impact: 7, hurt: 10 } as const;

const IDLE_SQUASH: readonly number[] = [0, 1, 0, -1];
const WINDUP_SQUASH: readonly number[] = [2, 4, 5];
const IMPACT_SQUASH: readonly number[] = [-5, -2, 0];

export function bossClips(world: WorldId, faction: string): EnemyClips {
  const paint = (sprite: readonly string[]) => shade([sprite], faction);
  const idle = IDLE_SQUASH.map((rows, frame) => paint(squash(bossSprite(world, { flicker: frame, angry: false }), rows)));
  const windup = WINDUP_SQUASH.map((rows, frame) => paint(squash(bossSprite(world, { flicker: 4 + frame, angry: true }), rows)));
  const impact = IMPACT_SQUASH.map((rows, frame) => paint(squash(bossSprite(world, { flicker: 6 - frame * 2, angry: true }), rows)));
  return { moving: [...idle, ...windup, ...impact, ...hurtFrames(idle[0] ?? [])], death: deathFrames(paint(bossSprite(world))) };
}
