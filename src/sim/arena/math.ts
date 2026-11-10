export const SUB = 16;
export const TICKS_PER_SECOND = 60;
export const ANGLE_STEPS = 256;
export const UNIT = 1024;

export const SIN_TABLE: readonly number[] = Array.from({ length: ANGLE_STEPS }, (_, step) =>
  Math.round(Math.sin((step * 2 * Math.PI) / ANGLE_STEPS) * UNIT),
);

export function sinStep(step: number): number {
  return SIN_TABLE[((step % ANGLE_STEPS) + ANGLE_STEPS) % ANGLE_STEPS] ?? 0;
}

export function cosStep(step: number): number {
  return sinStep(step + ANGLE_STEPS / 4);
}

export function px(pixels: number): number {
  return pixels * SUB;
}

export function seconds(value: number): number {
  return Math.round(value * TICKS_PER_SECOND);
}

export function isqrt(value: number): number {
  if (value <= 0) {
    return 0;
  }
  let root = Math.floor(Math.sqrt(value));
  while (root * root > value) {
    root -= 1;
  }
  while ((root + 1) * (root + 1) <= value) {
    root += 1;
  }
  return root;
}

export function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function scaleToLength(dx: number, dy: number, length: number): { readonly x: number; readonly y: number } {
  const magnitude = isqrt(dx * dx + dy * dy);
  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }
  return { x: Math.trunc((dx * length) / magnitude), y: Math.trunc((dy * length) / magnitude) };
}

export function percentOf(value: number, percent: number): number {
  return Math.trunc((value * percent) / 100);
}
