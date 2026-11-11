import type { RegularKind, WorldId } from "../sim/arena/content";
import type { Tier } from "../sim/tiers";
import { deathFrames, hurtFrames, squash, walkFrames, type DeathSheet } from "./animate";
import { TRANSPARENT } from "./palette";
import type { Sprite } from "./sprites";
import { eliteSprite } from "./arena-sprites";
import { enemyActs, enemyPoses, enemySprite, wallSprite } from "./world-enemies";
import { agentPose } from "./agent";
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

const WINDUP_CROUCH: readonly number[] = [1, 2];

function knockedFlat(sprite: Sprite): Sprite {
  const height = sprite.length;
  const width = sprite[0]?.length ?? 0;
  return Array.from({ length: width }, (_, x) => Array.from({ length: height }, (_, y) => sprite[height - 1 - y]?.[x] ?? TRANSPARENT).join(""));
}

function bellyUp(sprite: Sprite): Sprite {
  return [...sprite].reverse();
}

export function enemyClips(world: WorldId, kind: RegularKind, faction: string, elite: boolean): EnemyClips {
  const sprite = enemySprite(world, kind);
  const acts = enemyActs(world, kind);
  const dress = (frame: Sprite) => (elite ? eliteSprite(frame) : frame);
  const paint = (frame: Sprite) => shade([dress(frame)], faction);
  const walk = (enemyPoses(world, kind) ?? walkFrames(sprite)).map(paint);
  const windup = WINDUP_CROUCH.map((rows, frame) => paint(squash(acts?.windup[frame] ?? sprite, rows)));
  const corpse = acts ? bellyUp(acts.dead) : sprite;
  return { moving: [...walk, ...hurtFrames(walk[0] ?? []), ...windup], death: deathFrames(paint(corpse)) };
}

export function wallClips(world: WorldId, faction: string): ColorGrid[] {
  const wall = shade([wallSprite(world)], faction);
  return [wall, wall, wall, wall, ...hurtFrames(wall)];
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
  return { moving: [...idle, ...windup, ...impact, ...hurtFrames(idle[0] ?? [])], death: deathFrames(paint(knockedFlat(bossSprite(world, { flicker: 0, angry: false, dead: true })))) };
}

export function agentClips(tier: Tier): ColorGrid[] {
  return [0, 1, 2, 3].map((frame) => shade([agentPose(tier, frame)], "#ffffff"));
}
