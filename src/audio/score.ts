import type { Tier } from "../sim/tiers";

export interface ScoreLayer {
  readonly tier: Tier;
  readonly name: string;
  readonly code: string;
}

export const SCORE_LAYERS: readonly ScoreLayer[] = [
  { tier: 1, name: "Drone", code: 'note("<c3 g2 ab2 bb2>").s("triangle").attack(.4).release(1.5).gain(.25)' },
  { tier: 2, name: "Bass", code: 'note("<c2 [~ c2] eb2 [~ g1]>*2").s("sawtooth").lpf(700).decay(.2).sustain(.3).gain(.35)' },
  { tier: 3, name: "Kick", code: 'note("c1*4").s("sine").decay(.18).sustain(0).gain(.8)' },
  { tier: 4, name: "Arp", code: 'note("c4 eb4 g4 bb4 g4 eb4").fast(2).s("square").lpf(1800).decay(.1).sustain(0).gain(.12)' },
  { tier: 5, name: "Hats and lead", code: 'stack(s("white*8").decay(.03).sustain(0).gain(.08), note("<g4 bb4 c5 [eb5 d5]>").s("sawtooth").lpf(2400).gain(.12))' },
];

export const SCORE_CPM = 30;

export function layersFor(tier: Tier): readonly ScoreLayer[] {
  return SCORE_LAYERS.filter((layer) => layer.tier <= tier);
}

export function scoreFor(tier: Tier): string {
  const layers = layersFor(tier).map((layer) => `  ${layer.code}`);
  return `stack(\n${layers.join(",\n")}\n).cpm(${SCORE_CPM})`;
}

