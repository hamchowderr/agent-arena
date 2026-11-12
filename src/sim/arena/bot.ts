import { distanceSquared, px, SUB } from "./math";
import { choose, createArena, step, type ArenaState, type Input } from "./sim";

const THREAT_RANGE = px(70);
const PANIC_RANGE = px(14);
const SHOT_DODGE_RANGE = px(36);

function sign(value: number): -1 | 0 | 1 {
  return value > 1 ? 1 : value < -1 ? -1 : 0;
}

export function kitingBot(state: ArenaState): Input {
  const player = state.player;
  if (state.kit !== null) {
    return { moveX: sign(state.kit.x - player.x), moveY: sign(state.kit.y - player.y), dash: false };
  }
  let awayX = 0;
  let awayY = 0;
  let panic = false;
  for (const enemy of state.enemies) {
    const squared = distanceSquared(enemy.x, enemy.y, player.x, player.y);
    if (squared > THREAT_RANGE * THREAT_RANGE) {
      continue;
    }
    if (squared < PANIC_RANGE * PANIC_RANGE) {
      panic = true;
    }
    const weight = Math.trunc((THREAT_RANGE * THREAT_RANGE) / Math.max(squared, SUB * SUB));
    awayX += Math.sign(player.x - enemy.x) * weight * (enemy.kind === "boss" ? 6 : 1);
    awayY += Math.sign(player.y - enemy.y) * weight * (enemy.kind === "boss" ? 6 : 1);
  }
  if (state.slam && distanceSquared(state.slam.x, state.slam.y, player.x, player.y) < px(48) * px(48)) {
    awayX += Math.sign(player.x - state.slam.x) * 400;
    awayY += Math.sign(player.y - state.slam.y) * 400;
  }
  for (const shot of state.shots) {
    const squared = distanceSquared(shot.x, shot.y, player.x, player.y);
    if (squared > SHOT_DODGE_RANGE * SHOT_DODGE_RANGE) {
      continue;
    }
    if (squared < PANIC_RANGE * PANIC_RANGE) {
      panic = true;
    }
    const weight = Math.trunc((SHOT_DODGE_RANGE * SHOT_DODGE_RANGE * 2) / Math.max(squared, SUB * SUB));
    awayX += Math.sign(player.x - shot.x) * weight;
    awayY += Math.sign(player.y - shot.y) * weight;
  }
  for (const hazard of state.hazards) {
    const reach = hazard.radius + px(12);
    if (distanceSquared(hazard.x, hazard.y, player.x, player.y) < reach * reach) {
      awayX += Math.sign(player.x - hazard.x) * 200;
      awayY += Math.sign(player.y - hazard.y) * 200;
    }
  }
  for (const patch of state.patches) {
    const reach = patch.radius + px(10);
    if (distanceSquared(patch.x, patch.y, player.x, player.y) < reach * reach) {
      awayX += Math.sign(player.x - patch.x) * 120;
      awayY += Math.sign(player.y - patch.y) * 120;
    }
  }
  let best = Number.POSITIVE_INFINITY;
  let gemX = 0;
  let gemY = 0;
  for (const gem of state.gems) {
    const squared = distanceSquared(gem.x, gem.y, player.x, player.y);
    if (squared < best) {
      best = squared;
      gemX = Math.sign(gem.x - player.x);
      gemY = Math.sign(gem.y - player.y);
    }
  }
  awayX += gemX * 3;
  awayY += gemY * 3;
  return { moveX: sign(awayX), moveY: sign(awayY), dash: panic };
}

export function pickRecommended(state: ArenaState): void {
  const index = state.cards.findIndex((card) => card.recommended);
  choose(state, Math.max(0, index));
}

export interface BotRun {
  readonly state: ArenaState;
  readonly hash: number;
}

export function playBotRun(seed: number, maxTicks: number): BotRun {
  const state = createArena(seed);
  let hash = 2166136261;
  while (state.tick < maxTicks && (state.status === "playing" || state.status === "levelUp")) {
    if (state.status === "levelUp") {
      pickRecommended(state);
      continue;
    }
    step(state, kitingBot(state));
    hash = Math.imul(hash ^ (state.player.x + state.player.y * 31 + state.enemies.length * 7 + state.kills), 16777619) >>> 0;
  }
  return { state, hash };
}
