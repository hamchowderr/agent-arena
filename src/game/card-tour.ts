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
