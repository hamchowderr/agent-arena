import { describe, expect, it } from "vitest";
import { tourStop } from "./card-tour";

describe("card tour", () => {
  it("explains each card in turn for its reading time, then starts over", () => {
    const durations = [4, 6, 5];
    expect(tourStop(durations, 0)).toEqual({ index: 0, progress: 0 });
    expect(tourStop(durations, 2)).toEqual({ index: 0, progress: 0.5 });
    expect(tourStop(durations, 4).index).toBe(1);
    expect(tourStop(durations, 9.9).index).toBe(1);
    expect(tourStop(durations, 10).index).toBe(2);
    expect(tourStop(durations, 15)).toEqual({ index: 0, progress: 0 });
  });

  it("stays on the first card when there is nothing to time", () => {
    expect(tourStop([], 7)).toEqual({ index: 0, progress: 0 });
    expect(tourStop([0, 0], 7)).toEqual({ index: 0, progress: 0 });
  });
});
