export const SWING = ".swingBy(1/4, 4)";

export function rhodes(chords: string, tone = 1300): string {
  return `note("${chords}").s("triangle").attack(.06).decay(.9).sustain(.5).release(1.4).lpf(${tone}).vib(4).vibmod(.06).gain(.09).room(.35)`;
}

export function upright(line: string, tone = 420): string {
  return `note("${line}").s("triangle").lpf(${tone}).attack(.01).decay(.35).sustain(.25).release(.2).gain(.42)`;
}

export function kit(kick: string, snare = "~ white ~ white", extra = ""): string {
  const kickVoice = `note("${kick}").s("sine").decay(.28).sustain(0).lpf(240).gain(.75)`;
  const snareVoice = `s("${snare}").bpf(1700).decay(.11).sustain(0).gain(.16).room(.25)`;
  const voices = extra ? [kickVoice, snareVoice, extra] : [kickVoice, snareVoice];
  return `stack(${voices.join(", ")})${SWING}`;
}

export function hats(pattern = "white*8", tone = 7500): string {
  return `s("${pattern}").hpf(${tone}).decay(.03).sustain(0).gain("[.05 .028]*4")${SWING}`;
}

export const CRACKLE = 's("pink*16").degradeBy(.7).hpf(2600).decay(.006).sustain(0).gain(.07)';

export const HISS = 's("brown").hpf(1800).attack(.5).release(.5).gain(.012)';
