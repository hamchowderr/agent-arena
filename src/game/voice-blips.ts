import type { WorldId } from "../sim/arena/content";
import type { Voice } from "./story";

export type BlipWave = "square" | "triangle" | "sawtooth" | "sine";

export interface Blip {
  readonly frequency: number;
  readonly wave: BlipWave;
  readonly seconds: number;
  readonly gain: number;
  readonly slide: number;
}

interface VoiceSound {
  readonly base: number;
  readonly wave: BlipWave;
  readonly steps: readonly number[];
  readonly seconds: number;
  readonly gain: number;
}

const VOICE_SOUNDS: Readonly<Record<Exclude<Voice, "boss">, VoiceSound>> = {
  guide: { base: 294, wave: "square", steps: [0, 2, 4, 7, 9], seconds: 0.045, gain: 0.05 },
  you: { base: 523, wave: "triangle", steps: [0, 3, 5, 7], seconds: 0.04, gain: 0.07 },
  rival: { base: 233, wave: "sawtooth", steps: [0, 1, 6], seconds: 0.05, gain: 0.04 },
};

const BOSS_BASE: Readonly<Record<WorldId, number>> = {
  hustlr: 165,
  notionally: 147,
  meterly: 123,
  synergex: 139,
  trustMe: 110,
};

const BOSS_STEPS = [0, 1, 3, 6] as const;

export const BLIP_EVERY = 2;

const SILENT = /[\s.,!?;:'"()\-–—…·。、！？「」]/u;

export function blipIndices(text: string, from: number, to: number): number[] {
  const chars = [...text];
  const indices: number[] = [];
  for (let index = Math.max(0, from); index < Math.min(to, chars.length); index += 1) {
    const char = chars[index] ?? " ";
    if (index % BLIP_EVERY === 0 && !SILENT.test(char)) {
      indices.push(index);
    }
  }
  return indices;
}

function semitones(base: number, steps: number): number {
  return Math.round(base * 2 ** (steps / 12) * 100) / 100;
}

export function blipFor(voice: Voice, world: WorldId, char: string): Blip {
  const code = char.codePointAt(0) ?? 0;
  if (voice === "boss") {
    const step = BOSS_STEPS[code % BOSS_STEPS.length] ?? 0;
    return { frequency: semitones(BOSS_BASE[world], step), wave: "sawtooth", seconds: 0.06, gain: 0.05, slide: 0.92 };
  }
  const sound = VOICE_SOUNDS[voice];
  const step = sound.steps[code % sound.steps.length] ?? 0;
  return { frequency: semitones(sound.base, step), wave: sound.wave, seconds: sound.seconds, gain: sound.gain, slide: 1 };
}

export function entranceBoom(world: WorldId): Blip {
  return { frequency: semitones(BOSS_BASE[world] / 2, 0), wave: "sawtooth", seconds: 0.5, gain: 0.12, slide: 0.5 };
}
