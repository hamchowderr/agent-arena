import { describe, expect, it } from "vitest";
import { FRAME_FAILURES_BEFORE_RESET, startFrameLoop } from "./frame-loop";

function fakeFrames() {
  const queue: (() => void)[] = [];
  return {
    schedule: (next: () => void) => void queue.push(next),
    advance(count: number) {
      for (let index = 0; index < count; index += 1) {
        queue.shift()?.();
      }
    },
  };
}

describe("frame loop", () => {
  it("keeps running after a frame throws", () => {
    const frames = fakeFrames();
    let ran = 0;
    const failures: number[] = [];
    startFrameLoop({
      tick: () => {
        ran += 1;
        if (ran === 3) {
          throw new Error("bad frame");
        }
      },
      schedule: frames.schedule,
      onError: (_error, count) => failures.push(count),
    });
    frames.advance(10);
    expect(ran).toBe(11);
    expect(failures).toEqual([1]);
  });

  it("counts frames that keep failing so the game can reset", () => {
    const frames = fakeFrames();
    const failures: number[] = [];
    startFrameLoop({
      tick: () => {
        throw new Error("stuck");
      },
      schedule: frames.schedule,
      onError: (_error, count) => failures.push(count),
    });
    frames.advance(FRAME_FAILURES_BEFORE_RESET);
    expect(failures.at(-1)).toBe(FRAME_FAILURES_BEFORE_RESET + 1);
  });

  it("starts counting again after a good frame", () => {
    const frames = fakeFrames();
    let ran = 0;
    const failures: number[] = [];
    startFrameLoop({
      tick: () => {
        ran += 1;
        if (ran % 2 === 0) {
          throw new Error("flaky");
        }
      },
      schedule: frames.schedule,
      onError: (_error, count) => failures.push(count),
    });
    frames.advance(6);
    expect(failures).toEqual([1, 1, 1]);
  });
});
