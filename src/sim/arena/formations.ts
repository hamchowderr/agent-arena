import type { SignatureWave } from "./content";
import { ANGLE_STEPS, cosStep, px, seconds, sinStep, UNIT } from "./math";

export type EnemyOrder = "free" | "march" | "spiral" | "hold";

export type StagedEvent = "opening" | "wallRing" | "signature" | "swarm";

export const STAGED_EVENTS: readonly StagedEvent[] = ["opening", "wallRing", "signature", "swarm"];

export interface FormationSpawn {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly order: EnemyOrder;
  readonly driftX: number;
  readonly driftY: number;
  readonly goalX: number;
  readonly goalY: number;
  readonly life: number;
  readonly fake: boolean;
  readonly guardsFront: boolean;
  readonly wall: boolean;
  readonly healthPercent: number;
}

export const WALL_RING_RADIUS = px(150);
export const WALL_RING_LIFE = seconds(15);
export const WALL_HEALTH_PERCENT = 150;
export const SWARM_COUNT = 26;
export const SWARM_WIDTH = px(120);
export const SWARM_SPEED = 40;
export const SWARM_LIFE = seconds(5);
export const SPIRAL_LIFE = seconds(6);
export const SPIRAL_TURN = 40;
export const INBOX_SPEED = 14;
export const INBOX_LIFE = seconds(10);
export const CORRIDOR_HALF_WIDTH = px(90);
export const CORRIDOR_NARROW_HALF_WIDTH = px(45);
export const CORRIDOR_LIFE = seconds(14);
export const ALL_HANDS_RADIUS = px(140);
export const ALL_HANDS_HOLD_RADIUS = px(70);
export const ALL_HANDS_LIFE = seconds(12);
export const MIRAGE_RADIUS = px(150);

const BASE: FormationSpawn = {
  slot: 0,
  x: 0,
  y: 0,
  order: "free",
  driftX: 0,
  driftY: 0,
  goalX: 0,
  goalY: 0,
  life: 0,
  fake: false,
  guardsFront: false,
  wall: false,
  healthPercent: 100,
};

function polar(angle: number, distance: number): { readonly x: number; readonly y: number } {
  return { x: Math.trunc((cosStep(angle) * distance) / UNIT), y: Math.trunc((sinStep(angle) * distance) / UNIT) };
}

function along(angle: number, forward: number, side: number): { readonly x: number; readonly y: number } {
  const ahead = polar(angle, forward);
  const across = polar(angle + ANGLE_STEPS / 4, side);
  return { x: ahead.x + across.x, y: ahead.y + across.y };
}

function ring(count: number, radius: number, angle: number): { readonly x: number; readonly y: number }[] {
  return Array.from({ length: count }, (_, index) => polar(angle + Math.trunc((index * ANGLE_STEPS) / count), radius));
}

export function openingPack(count: number, angle: number): FormationSpawn[] {
  return ring(count, px(95), angle).map((at) => ({ ...BASE, x: at.x, y: at.y }));
}

export function wallRing(world: number, angle: number): FormationSpawn[] {
  return ring(24 + world * 4, WALL_RING_RADIUS, angle).map((at) => ({
    ...BASE,
    slot: 4,
    x: at.x,
    y: at.y,
    order: "hold",
    goalX: at.x,
    goalY: at.y,
    life: WALL_RING_LIFE,
    wall: true,
    healthPercent: WALL_HEALTH_PERCENT,
  }));
}

export function swarmStream(angle: number, lane: number): FormationSpawn[] {
  const drift = polar(angle + ANGLE_STEPS / 2, SWARM_SPEED);
  return Array.from({ length: SWARM_COUNT }, (_, index) => {
    const side = lane + Math.trunc((((index * 7) % SWARM_COUNT) * SWARM_WIDTH) / SWARM_COUNT) - SWARM_WIDTH / 2;
    const at = along(angle, px(230) + index * px(5), side);
    return { ...BASE, slot: 1, x: at.x, y: at.y, order: "march", driftX: drift.x, driftY: drift.y, life: SWARM_LIFE };
  });
}

export function signatureWave(wave: SignatureWave, world: number, angle: number): FormationSpawn[] {
  switch (wave) {
    case "viralThread":
      return Array.from({ length: 18 + world * 4 }, (_, index) => {
        const at = polar(angle + index * 6, px(240) - index * px(3));
        return { ...BASE, slot: 1, x: at.x, y: at.y, order: "spiral", life: SPIRAL_LIFE + index * 3 };
      });
    case "inboxZero": {
      const count = 36 + world * 4;
      const drift = polar(angle + ANGLE_STEPS / 2, INBOX_SPEED);
      return Array.from({ length: count }, (_, index) => {
        const at = along(angle, px(210), Math.trunc((index * px(360)) / count) - px(180));
        return { ...BASE, x: at.x, y: at.y, order: "march", driftX: drift.x, driftY: drift.y, life: INBOX_LIFE };
      });
    }
    case "canyonToll": {
      const walls = [-1, 1].flatMap((side) =>
        Array.from({ length: 16 }, (_, index) => {
          const forward = index * px(20) - px(150);
          const at = along(angle, forward, side * CORRIDOR_HALF_WIDTH);
          const goal = along(angle, forward, side * CORRIDOR_NARROW_HALF_WIDTH);
          return { ...BASE, slot: 4, x: at.x, y: at.y, order: "hold" as const, goalX: goal.x, goalY: goal.y, life: CORRIDOR_LIFE, wall: true, healthPercent: WALL_HEALTH_PERCENT };
        }),
      );
      const pings = [-1, 1].flatMap((end) =>
        Array.from({ length: 10 + world * 2 }, (_, index) => {
          const at = along(angle, end * (px(220) + (index >> 1) * px(10)), ((index % 2) * 2 - 1) * px(14));
          return { ...BASE, x: at.x, y: at.y };
        }),
      );
      return [...walls, ...pings];
    }
    case "allHands":
      return ring(16 + world * 2, ALL_HANDS_RADIUS, angle).map((at) => {
        const goal = { x: Math.trunc((at.x * ALL_HANDS_HOLD_RADIUS) / ALL_HANDS_RADIUS), y: Math.trunc((at.y * ALL_HANDS_HOLD_RADIUS) / ALL_HANDS_RADIUS) };
        return { ...BASE, slot: 3, x: at.x, y: at.y, order: "hold", goalX: goal.x, goalY: goal.y, life: ALL_HANDS_LIFE, guardsFront: true, wall: true, healthPercent: 200 };
      });
    case "mirageSchool":
      return ring(28 + world * 4, MIRAGE_RADIUS, angle).map((at, index) => ({ ...BASE, x: at.x, y: at.y, fake: index % 2 === 1 }));
  }
}
