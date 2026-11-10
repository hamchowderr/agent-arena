import type { Tier } from "../sim/tiers";
import { CRACKLE, HISS, hats, kit, rhodes, SWING, upright } from "./voices";

export interface TrackLayer {
  readonly tier: Tier;
  readonly name: string;
  readonly code: string;
}

export interface Track {
  readonly id: string;
  readonly section: string;
  readonly title: string;
  readonly cpm: number;
  readonly bossRoot: string;
  readonly bossStab: string;
  readonly layers: readonly TrackLayer[];
}

export const BED: readonly TrackLayer[] = [
  { tier: 1, name: "Vinyl", code: CRACKLE },
  { tier: 1, name: "Hiss", code: HISS },
];

function layers(keys: string, bass: string, drums: string, lead: string, top: string): readonly TrackLayer[] {
  return [
    { tier: 1, name: "Keys", code: keys },
    { tier: 2, name: "Bass", code: bass },
    { tier: 3, name: "Drums", code: drums },
    { tier: 4, name: "Lead", code: lead },
    { tier: 5, name: "Top", code: top },
  ];
}

const BOOM_BAP = "<[c1 ~ ~ c1 ~ ~ ~ ~] [c1 ~ ~ c1 ~ c1 ~ ~]>";

export const TITLE_TRACK: Track = {
  id: "title",
  section: "Title",
  title: "Own Your Agent",
  cpm: 17,
  bossRoot: "f",
  bossStab: "[f4,gb4]",
  layers: layers(
    rhodes("<[a3,c4,e4,g4] [g3,b3,d4,e4] [f3,a3,c4,e4] [e3,g3,b3,d4]>", 1100),
    upright("<[f1 ~ c2 ~] [e2 ~ b1 ~] [d2 ~ a1 ~] [c2 ~ g1 b1]>"),
    kit("<[c1 ~ ~ ~ ~ ~ c1 ~] [c1 ~ ~ c1 ~ ~ ~ ~]>", "~ white ~ [~ white]"),
    `note("<[c5 ~ a4 ~] [b4 ~ ~ g4] [a4 ~ e4 ~] [g4 ~ ~ ~]>").s("sine").attack(.02).decay(.6).sustain(.2).lpf(2200).gain(.16).delay(.3).delaytime(.5).delayfeedback(.35)`,
    hats("[white ~ white white]*2"),
  ),
};

export const WORLD_TRACKS: readonly Track[] = [
  {
    id: "agents",
    section: "Agents",
    title: "Hello, Agent",
    cpm: 20,
    bossRoot: "d",
    bossStab: "[d4,eb4]",
    layers: layers(
      rhodes("<[d3,f3,a3,c4,e4] [f3,b3,e4,a4] [e3,g3,b3,d4] [g3,c#4,f4,a4]>"),
      upright("<[d2 ~ a1 ~] [g1 ~ ~ d2] [c2 ~ g1 ~] [a1 ~ e2 c#2]>"),
      kit(BOOM_BAP),
      `note("<[a4 ~ c5 e5] [d5 ~ b4 ~] [~ g4 b4 d5] [c#5 ~ a4 ~]>").s("triangle").attack(.01).decay(.4).sustain(.15).lpf(2400).gain(.15)${SWING}`,
      hats(),
    ),
  },
  {
    id: "tools",
    section: "Tools and MCP",
    title: "Toolbox",
    cpm: 21,
    bossRoot: "g",
    bossStab: "[g4,ab4]",
    layers: layers(
      rhodes("<[g3,bb3,d4,f4] [e3,bb3,d4,g4] [f3,a3,c4,e4] [f#3,c4,eb4,a4]>", 1500),
      upright("<[g1 ~ d2 ~] [c2 ~ ~ g1] [f1 ~ c2 ~] [d2 ~ a1 f#1]>"),
      kit(BOOM_BAP, "~ white ~ white", 's("~ ~ ~ white*2").bpf(4000).decay(.02).sustain(0).gain(.06)'),
      `note("<[d5 f5 ~ d5] [e5 ~ c5 bb4] [a4 c5 e5 ~] [f#5 ~ eb5 c5]>").s("square").decay(.09).sustain(0).lpf(1900).gain(.08)${SWING}`,
      `stack(${hats()}, s("white*16").degradeBy(.5).hpf(9500).decay(.01).sustain(0).gain(.03))`,
    ),
  },
  {
    id: "memory",
    section: "Memory",
    title: "Recall",
    cpm: 18,
    bossRoot: "ab",
    bossStab: "[ab4,a4]",
    layers: layers(
      rhodes("<[ab3,c4,eb4,g4] [f3,bb3,d4,g4] [eb3,ab3,c4,g4] [ab3,d4,g4]>", 1200),
      upright("<[ab1 ~ eb2 ~] [g1 ~ d2 ~] [f1 ~ c2 ~] [bb1 ~ f1 ~]>"),
      kit("<[c1 ~ ~ ~ ~ c1 ~ ~] [c1 ~ ~ c1 ~ ~ ~ ~]>"),
      `note("<[eb5 ~ ~ ~] [d5 ~ bb4 ~] [c5 ~ ~ ab4] [g4 ~ ~ ~]>").s("sine").decay(.5).sustain(.2).lpf(2000).gain(.17).delay(.5).delaytime(.375).delayfeedback(.55)`,
      hats("white*8", 6500),
    ),
  },
  {
    id: "workflows",
    section: "Workflows",
    title: "Step by Step",
    cpm: 22,
    bossRoot: "a",
    bossStab: "[a4,bb4]",
    layers: layers(
      rhodes("<[g3,b3,c4,e4] [f3,a3,c4,e4] [f3,b3,e4] [e3,g3,b3,d4]>"),
      upright("<[a1 ~ e2 ~] [d2 ~ a1 ~] [g1 ~ d2 ~] [c2 ~ g1 e1]>"),
      kit("c1 ~ ~ c1 ~ ~ c1 ~"),
      `note("<[a3 c4 e4 g4 b4 g4 e4 c4] [d4 f4 a4 c5 e5 c5 a4 f4] [g3 b3 d4 f4 a4 f4 d4 b3] [c4 e4 g4 b4 d5 b4 g4 e4]>").s("triangle").decay(.15).sustain(0).lpf(1600).gain(.11)${SWING}`,
      hats("white*8", 8000),
    ),
  },
  {
    id: "guardrails",
    section: "Guardrails",
    title: "Inside the Lines",
    cpm: 19,
    bossRoot: "g",
    bossStab: "[g4,db5]",
    layers: layers(
      rhodes("<[bb3,d4,f4,a4] [eb3,g3,bb3,d4] [eb3,a3,d4] [d3,a3,c4]>", 1000),
      upright("<[g1 ~ d2 ~] [c2 ~ g1 ~] [f1 ~ c2 ~] [bb1 ~ f1 ~]>", 360),
      kit(BOOM_BAP, "~ white ~ white*2"),
      `note("<[d5 ~ d5 c5] [bb4 ~ c5 ~] [a4 ~ c5 d5] [d5 ~ ~ ~]>").s("sawtooth").decay(.3).sustain(.1).lpf(1100).gain(.08)${SWING}`,
      hats("[white ~]*4", 7000),
    ),
  },
  {
    id: "evals",
    section: "Evals",
    title: "Scorecard",
    cpm: 21,
    bossRoot: "e",
    bossStab: "[e4,f4]",
    layers: layers(
      rhodes("<[g3,b3,d4,f#4] [g3,c#4,f#4] [f#3,a3,c#4] [a3,c4,d#4]>"),
      upright("<[e2 ~ b1 ~] [a1 ~ e2 ~] [d2 ~ a1 ~] [b1 ~ f#1 d#2]>"),
      kit(BOOM_BAP, "~ white ~ white", 'note("c6*4").s("square").hpf(3000).decay(.015).sustain(0).gain(.03)'),
      `note("<[b4 d5 e5 ~] [~ ~ c#5 ~] [f#5 e5 d5 ~] [~ ~ d#5 ~]>").s("triangle").decay(.35).sustain(.1).lpf(2600).gain(.15)${SWING}`,
      hats(),
    ),
  },
  {
    id: "observability",
    section: "Observability",
    title: "Every Trace",
    cpm: 19,
    bossRoot: "c",
    bossStab: "[c4,db4]",
    layers: layers(
      rhodes("<[eb3,g3,bb3,d4] [eb3,a3,d4] [d3,f3,a3,c4] [f3,b3,eb4,ab4]>", 1400),
      upright("<[c2 ~ g1 ~] [f1 ~ c2 ~] [bb1 ~ f1 ~] [g1 ~ d2 b1]>"),
      kit("<[c1 ~ ~ c1 ~ ~ ~ ~] [c1 ~ c1 ~ ~ c1 ~ ~]>"),
      `note("<[g5 ~ bb5 ~] [a5 ~ f5 ~] [d5 f5 a5 c6] [b5 ~ ab5 ~]>").s("sine").decay(.3).sustain(.1).lpf(3000).gain(.1).pan(sine.slow(4)).room(.6)`,
      `stack(${hats("white*16", 9000)}, note("<c7 g6>*8").s("sine").decay(.04).sustain(0).gain(.02).pan(cosine.slow(2)))`,
    ),
  },
  {
    id: "voice",
    section: "Voice",
    title: "Say It Back",
    cpm: 20,
    bossRoot: "b",
    bossStab: "[b3,c4]",
    layers: layers(
      rhodes("<[d3,f#3,a3,c#4] [d3,g#3,b3,f#4] [e3,g#3,a3,c#4] [e3,a#3,c#4,g4]>"),
      upright("<[b1 ~ f#2 ~] [e2 ~ b1 ~] [a1 ~ e2 ~] [f#1 ~ c#2 a#1]>"),
      kit(BOOM_BAP, "~ white ~ [white ~ ~ white]"),
      `note("<[f#4 a4 b4 ~] [g#4 ~ f#4 e4] [c#5 ~ b4 a4] [a#4 ~ ~ ~]>").s("sawtooth").vowel("<a e i o>").decay(.4).sustain(.2).lpf(2200).gain(.07)${SWING}`,
      hats("white*8", 7200),
    ),
  },
  {
    id: "deployment",
    section: "Deployment",
    title: "Ship It",
    cpm: 23,
    bossRoot: "f",
    bossStab: "[f4,gb4]",
    layers: layers(
      rhodes("<[ab3,c4,eb4,g4] [ab3,d4,g4] [g3,bb3,d4,f4] [eb3,g3,bb3,d4]>", 1600),
      upright("<[f1 ab1 c2 eb2] [bb1 d2 f2 ab1] [eb2 g1 bb1 d2] [c2 eb2 g2 b1]>", 480),
      kit("<[c1 ~ ~ c1 ~ ~ c1 ~] [c1 ~ ~ c1 ~ c1 ~ c1]>", "~ white ~ white"),
      `note("<[c5 eb5 f5 g5] [ab5 ~ g5 f5] [g5 ~ bb5 ~] [g5 ~ ~ ~]>").s("triangle").decay(.4).sustain(.2).lpf(2800).gain(.15)${SWING}`,
      `stack(${hats()}, note("<[eb6,g6] ~ [d6,f6] ~>").s("sine").decay(.5).sustain(0).gain(.03).room(.5))`,
    ),
  },
];

export function bossLayers(track: Track): readonly TrackLayer[] {
  return [
    { tier: 1, name: "Boss pulse", code: `note("${track.bossRoot}1*8").s("sawtooth").lpf("<350 500 700 1000>").decay(.12).sustain(0).gain(.22)` },
    { tier: 1, name: "Boss stab", code: `note("${track.bossStab} ~ ~ [~ ${track.bossStab}]").s("square").lpf(1200).decay(.2).sustain(0).gain(.06)` },
    { tier: 1, name: "Boss drums", code: kit("c1*4", "~ white ~ [white white]") },
  ];
}

export const BOSS_TEMPO_BONUS = 4;
