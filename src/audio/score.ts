import type { Tier } from "../sim/tiers";
import { BED, BOSS_TEMPO_BONUS, bossLayers, TITLE_TRACK, WORLD_TRACKS, type Track, type TrackLayer } from "./tracks";

export type MusicCue =
  | { readonly kind: "title" }
  | { readonly kind: "world"; readonly world: number; readonly tier: Tier; readonly boss: boolean };

export interface MusicSituation {
  readonly onTitle: boolean;
  readonly tier: Tier;
  readonly bossesDown: number;
  readonly bossId: number | null;
}

export function cueFor(situation: MusicSituation): MusicCue {
  if (situation.onTitle) {
    return { kind: "title" };
  }
  const world = Math.min(situation.bossesDown, WORLD_TRACKS.length - 1);
  return { kind: "world", world, tier: situation.tier, boss: situation.bossId !== null };
}

export function cueKey(cue: MusicCue): string {
  return cue.kind === "title" ? "title" : `world-${cue.world}-tier-${cue.tier}${cue.boss ? "-boss" : ""}`;
}

export function trackFor(cue: MusicCue): Track {
  if (cue.kind === "title") {
    return TITLE_TRACK;
  }
  const track = WORLD_TRACKS[cue.world];
  if (!track) {
    throw new RangeError(`No track for world ${cue.world}`);
  }
  return track;
}

export function layersFor(cue: MusicCue): readonly TrackLayer[] {
  const track = trackFor(cue);
  if (cue.kind === "title") {
    return [...BED, ...track.layers];
  }
  const grown = track.layers.filter((layer) => layer.tier <= cue.tier);
  if (!cue.boss) {
    return [...BED, ...grown];
  }
  return [...BED, ...grown.filter((layer) => layer.name !== "Drums"), ...bossLayers(track)];
}

export function tempoFor(cue: MusicCue): number {
  const { cpm } = trackFor(cue);
  return cue.kind === "world" && cue.boss ? cpm + BOSS_TEMPO_BONUS : cpm;
}

export function scoreFor(cue: MusicCue): string {
  const layers = layersFor(cue).map((layer) => `  ${layer.code}`);
  return `stack(\n${layers.join(",\n")}\n).cpm(${tempoFor(cue)})`;
}
