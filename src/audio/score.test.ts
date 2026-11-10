import { beforeAll, describe, expect, it } from "vitest";
import musicDoc from "../../docs/music.md?raw";
import { WORLDS } from "../sim/arena/content";
import { TIERS } from "../sim/tiers";
import { cueFor, cueKey, layersFor, scoreFor, tempoFor, type MusicCue } from "./score";
import { trackTable } from "./track-list";
import { BED, bossLayers, TITLE_TRACK, WORLD_TRACKS } from "./tracks";

const MASTRA_SECTIONS = ["agents", "tools", "memory", "workflows", "guardrails", "evals", "observability", "voice", "deployment"];

const worldCues: MusicCue[] = WORLD_TRACKS.flatMap((_, world) =>
  TIERS.flatMap(({ tier }) => [false, true].map((boss) => ({ kind: "world", world, tier, boss }) as const)),
);

const allLayers = [TITLE_TRACK, ...WORLD_TRACKS].flatMap((track) =>
  [...track.layers, ...bossLayers(track)].map((layer) => ({ track: track.title, ...layer })),
);

describe("tracks", () => {
  it("has one world track per Mastra docs section, in order", () => {
    expect(WORLD_TRACKS.map((track) => track.id)).toEqual(MASTRA_SECTIONS);
  });

  it("has a track for every world in the game", () => {
    expect(WORLD_TRACKS.length).toBeGreaterThanOrEqual(WORLDS.length);
  });

  it("keeps every track lo-fi slow, 70 to 95 bpm", () => {
    for (const track of [TITLE_TRACK, ...WORLD_TRACKS]) {
      expect(track.cpm * 4).toBeGreaterThanOrEqual(68);
      expect(track.cpm * 4).toBeLessThanOrEqual(95);
    }
  });

  it("gives every world its own name and tempo or key", () => {
    const fingerprints = WORLD_TRACKS.map((track) => `${track.cpm}-${track.layers[0]?.code ?? ""}`);
    expect(new Set(fingerprints).size).toBe(WORLD_TRACKS.length);
    expect(new Set(WORLD_TRACKS.map((track) => track.title)).size).toBe(WORLD_TRACKS.length);
  });

  it("adds one layer each time the agent tiers up", () => {
    for (const world of WORLD_TRACKS.keys()) {
      for (const { tier } of TIERS) {
        expect(layersFor({ kind: "world", world, tier, boss: false })).toHaveLength(BED.length + tier);
      }
    }
  });

  it("swaps the world's drums for the boss kit and speeds up when a boss arrives", () => {
    const calm: MusicCue = { kind: "world", world: 2, tier: 3, boss: false };
    const boss: MusicCue = { ...calm, boss: true };
    const names = layersFor(boss).map((layer) => layer.name);
    expect(names).not.toContain("Drums");
    expect(names).toContain("Boss drums");
    expect(tempoFor(boss)).toBeGreaterThan(tempoFor(calm));
  });
});

describe("docs", () => {
  it("lists every track in docs/music.md with working listen links", () => {
    expect(musicDoc).toContain(trackTable());
  });
});

describe("cues", () => {
  const run = { onTitle: false, tier: 2, bossesDown: 0, bossId: null } as const;

  it("plays the title track on the title screen", () => {
    expect(cueFor({ ...run, onTitle: true })).toEqual({ kind: "title" });
  });

  it("follows the world the player is in and the boss fight", () => {
    expect(cueFor({ ...run, bossesDown: 3 })).toEqual({ kind: "world", world: 3, tier: 2, boss: false });
    expect(cueFor({ ...run, bossesDown: 3, bossId: 7 })).toMatchObject({ world: 3, boss: true });
  });

  it("stays on the last world track after the final boss", () => {
    expect(cueFor({ ...run, bossesDown: 99 })).toMatchObject({ world: WORLD_TRACKS.length - 1 });
  });

  it("gives every distinct cue a distinct key, so a change always restarts the music", () => {
    const keys = [{ kind: "title" } as const, ...worldCues].map(cueKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("tracks in Strudel", () => {
  let core: typeof import("@strudel/core");
  let transpiler: unknown;
  const evaluate = (code: string) => core.evaluate(code, transpiler);

  beforeAll(async () => {
    core = await import("@strudel/core");
    await core.evalScope(core, await import("@strudel/mini"));
    ({ transpiler } = await import("@strudel/transpiler"));
  });

  it.each([...BED.map((layer) => ({ track: "Bed", ...layer })), ...allLayers])(
    "$track: $name parses and makes sound every cycle",
    async (layer) => {
      const { pattern } = await evaluate(layer.code);
      for (let cycle = 0; cycle < 8; cycle += 1) {
        expect(pattern.queryArc(cycle, cycle + 1).length).toBeGreaterThan(0);
      }
    },
  );

  it.each([{ kind: "title" } as const, ...worldCues].map((cue) => ({ key: cueKey(cue), cue })))("$key plays", async ({ cue }) => {
    const { pattern } = await evaluate(scoreFor(cue));
    expect(pattern.queryArc(0, 1).length).toBeGreaterThan(0);
  });

  it("swings the drums, so the test reads the groove", async () => {
    const drums = WORLD_TRACKS[0]?.layers.find((layer) => layer.name === "Drums");
    const { pattern } = await evaluate(drums?.code ?? "");
    const onsets = pattern.queryArc(0, 1).map((hap) => Number((hap as unknown as { whole: { begin: unknown } }).whole.begin));
    const offbeats = onsets.filter((begin) => (begin * 8) % 2 !== 0 && (begin * 8) % 1 !== 0);
    expect(offbeats.length).toBeGreaterThan(0);
  });

  it("catches broken mini-notation", async () => {
    await expect(evaluate('note("c2 ]] <").s("sine")')).rejects.toThrow();
  });
});
