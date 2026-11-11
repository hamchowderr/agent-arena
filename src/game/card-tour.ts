export interface TourStop {
  readonly index: number;
  readonly progress: number;
}

export function tourStop(
  durations: readonly number[],
  seconds: number,
): TourStop {
  const total = durations.reduce(
    (sum, duration) => sum + Math.max(0, duration),
    0,
  );
  if (total <= 0) {
    return { index: 0, progress: 0 };
  }
  let left = Math.max(0, seconds) % total;
  for (const [index, raw] of durations.entries()) {
    const duration = Math.max(0, raw);
    if (left < duration) {
      return { index, progress: left / duration };
    }
    left -= duration;
  }
  return { index: durations.length - 1, progress: 1 };
}

export class CardTour<Hand> {
  private hand: Hand | null = null;
  private quiet: Hand | null = null;
  private age = 0;

  frame(hand: Hand | null, seconds: number): void {
    if (hand !== this.hand) {
      this.hand = hand;
      this.age = 0;
      return;
    }
    this.age += seconds;
  }

  hush(hand: Hand): void {
    this.quiet = hand;
  }

  get seconds(): number {
    return this.age;
  }

  get talking(): boolean {
    return this.hand !== null && this.hand !== this.quiet;
  }
}
