export interface Rng {
  readonly nextUint32: () => number;
  readonly intBelow: (exclusiveMax: number) => number;
  readonly chancePercent: (percent: number) => boolean;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const nextUint32 = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return (mixed ^ (mixed >>> 14)) >>> 0;
  };

  const intBelow = (exclusiveMax: number): number => {
    if (!Number.isInteger(exclusiveMax) || exclusiveMax <= 0) {
      throw new RangeError(`intBelow needs a positive integer, got ${exclusiveMax}`);
    }
    return nextUint32() % exclusiveMax;
  };

  const chancePercent = (percent: number): boolean => intBelow(100) < percent;

  return { nextUint32, intBelow, chancePercent };
}

export function mixSeed(seed: number, salt: number): number {
  return (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(salt + 1, 0xc2b2ae35)) >>> 0;
}
