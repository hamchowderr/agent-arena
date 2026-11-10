import { scoreFor, tempoFor, type MusicCue } from "./score";
import { TITLE_TRACK, WORLD_TRACKS } from "./tracks";

export function strudelLink(code: string): string {
  return `https://strudel.cc/#${encodeURIComponent(btoa(code))}`;
}

function listen(label: string, cue: MusicCue): string {
  return `[${label}](${strudelLink(scoreFor(cue))})`;
}

export function trackTable(): string {
  const title: MusicCue = { kind: "title" };
  const rows = [`| Title screen | ${TITLE_TRACK.title} | ${tempoFor(title) * 4} | ${listen("listen", title)} | |`];
  WORLD_TRACKS.forEach((track, world) => {
    const calm: MusicCue = { kind: "world", world, tier: 5, boss: false };
    const boss: MusicCue = { ...calm, boss: true };
    rows.push(`| ${world + 1}. ${track.section} | ${track.title} | ${tempoFor(calm) * 4} | ${listen("listen", calm)} | ${listen("boss", boss)} |`);
  });
  return ["| World | Track | BPM | Full track | Boss variant |", "|---|---|---|---|---|", ...rows].join("\n");
}
