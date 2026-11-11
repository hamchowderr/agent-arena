import { describe, expect, it } from "vitest";
import { WORLDS } from "../sim/arena/content";
import { blipFor, blipIndices, entranceBoom } from "./voice-blips";
import type { Voice } from "./story";

describe("voice blips", () => {
  it("blips on every other letter and stays quiet on spaces and punctuation", () => {
    expect(blipIndices("hello there", 0, 11)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(blipIndices("a. b", 0, 4)).toEqual([0]);
    expect(blipIndices("go, now", 0, 7)).toEqual([0, 4, 6]);
    expect(blipIndices("一二三四", 0, 4)).toEqual([0, 2]);
  });

  it("only blips for the letters typed since the last frame", () => {
    expect(blipIndices("hello there", 4, 9)).toEqual([4, 6, 8]);
    expect(blipIndices("hi", 0, 50)).toEqual([0]);
    expect(blipIndices("hello", 3, 3)).toEqual([]);
  });

  it("gives each speaker its own sound and each boss its own pitch", () => {
    const voices: Voice[] = ["guide", "you", "rival"];
    const sounds = voices.map((voice) => `${blipFor(voice, "hustlr", "a").wave}:${blipFor(voice, "hustlr", "a").frequency}`);
    expect(new Set(sounds).size).toBe(voices.length);
    const bosses = WORLDS.map((world) => blipFor("boss", world.id, "a").frequency);
    expect(new Set(bosses).size).toBe(WORLDS.length);
    expect(Math.max(...bosses)).toBeLessThan(blipFor("guide", "hustlr", "a").frequency);
  });

  it("plays the same note for the same letter every time", () => {
    expect(blipFor("guide", "meterly", "k")).toEqual(blipFor("guide", "meterly", "k"));
  });

  it("booms below every boss voice at the entrance", () => {
    for (const world of WORLDS) {
      expect(entranceBoom(world.id).frequency).toBeLessThan(blipFor("boss", world.id, "a").frequency);
    }
  });
});
