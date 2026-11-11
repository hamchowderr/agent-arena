import type { Blip } from "./voice-blips";

let audio: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof AudioContext === "undefined") {
    return null;
  }
  audio ??= new AudioContext();
  if (audio.state === "suspended") {
    void audio.resume();
  }
  return audio;
}

export function playBlip(blip: Blip): void {
  const ctx = context();
  if (!ctx || ctx.state !== "running") {
    return;
  }
  const start = ctx.currentTime;
  const end = start + blip.seconds;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = blip.wave;
  oscillator.frequency.setValueAtTime(blip.frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, blip.frequency * blip.slide), end);
  gain.gain.setValueAtTime(blip.gain, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}
