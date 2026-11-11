import { describe, expect, it } from "vitest";
import { CardTour, tourStop } from "./card-tour";

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

  it("stays quiet on the hand the card lesson just explained, so two explanations never run back to back", () => {
    const tour = new CardTour<readonly string[]>();
    const lessonHand = ["loopRunner", "vectorMemory", "fewShot"];
    tour.hush(lessonHand);
    tour.frame(lessonHand, 0);
    expect(tour.talking).toBe(false);
    tour.frame(lessonHand, 5);
    expect(tour.talking).toBe(false);
    const rerolled = ["apiCall", "verifier", "sandbox"];
    tour.frame(rerolled, 0);
    expect(tour.talking).toBe(true);
    expect(tour.seconds).toBe(0);
    tour.frame(rerolled, 2);
    expect(tour.seconds).toBe(2);
  });

  it("talks through every later hand and stops when the level-up closes", () => {
    const tour = new CardTour<readonly string[]>();
    tour.frame(["fewShot"], 0);
    expect(tour.talking).toBe(true);
    tour.frame(null, 0);
    expect(tour.talking).toBe(false);
  });
});
