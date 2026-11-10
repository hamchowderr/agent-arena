import type { Sprite } from "./sprites";

export const FACTION_KEY = "X";

export const GRUNT: Sprite = [
  "............",
  "....kkkk....",
  "...kXXXXk...",
  "..kXXXXXXk..",
  "..kXwXXwXk..",
  "..kXkXXkXk..",
  "..kXyyyyXk..",
  "...kXXXXk...",
  "...kkXXkk...",
  "..kXk..kXk..",
  "..kk....kk..",
  "............",
];

export const RUNNER: Sprite = [
  "............",
  "............",
  ".....kkkk...",
  "....kXXXXk..",
  "...kXwXXwk..",
  "...kXkXXkk..",
  ".s.kXXXXXk..",
  "ss..kXXXk...",
  "s....kkk....",
  "....kXkXk...",
  "....k...k...",
  "............",
];

export const BRUTE: Sprite = [
  "................",
  "....kkkkkkkk....",
  "...kXXXXXXXXk...",
  "..kXXXXXXXXXXk..",
  "..kXwwXXXXwwXk..",
  "..kXkwXXXXkwXk..",
  "..kXXXXXXXXXXk..",
  "..kXXyyyyyyXXk..",
  "..kXXyykkyyXXk..",
  "..kXXyyyyyyXXk..",
  "..kXXXXXXXXXXk..",
  "...kXXXXXXXXk...",
  "...kkXXkkXXkk...",
  "..kXXk....kXXk..",
  "..kkkk....kkkk..",
  "................",
];

export const BOSS: Sprite = [
  "......y..y..y.......",
  "......yy.yy.yy......",
  "......yyyyyyyy......",
  ".....kkkkkkkkkk.....",
  "....kXXXXXXXXXXk....",
  "...kXXXXXXXXXXXXk...",
  "..kXXwwwXXXXwwwXXk..",
  "..kXXwkkXXXXwkkXXk..",
  "..kXXXXXXXXXXXXXXk..",
  "..kXXXXXyyyyXXXXXk..",
  "..kXXXXyykkyyXXXXk..",
  "..kXXXXyyyyyyXXXXk..",
  "..kXXXXXXXXXXXXXXk..",
  "...kXXXXXXXXXXXXk...",
  ".kkkXXXXXXXXXXXXkkk.",
  "kXXkXXXXXXXXXXXXkXXk",
  "kXXkkXXXXXXXXXXkkXXk",
  ".kk.kXXXkkkkXXXk.kk.",
  "....kXXk....kXXk....",
  "....kkkk....kkkk....",
];

export const GEM: Sprite = ["..m..", ".mcm.", "mcwcm", ".mcm.", "..m.."];

export const BIG_GEM: Sprite = ["...y...", "..yoy..", ".yowoy.", "yowwwoy", ".yowoy.", "..yoy..", "...y..."];

export const BOLT: Sprite = ["..yy..", ".yooy.", "yowwoy", "yowwoy", ".yooy.", "..yy.."];

export const BEAM: Sprite = ["....mmmmmmmm", "..mmccccccww", "mmcccwwwwwww", "..mmccccccww", "....mmmmmmmm"];

export const SEEKER: Sprite = [".lll.", "lgwgl", "lgggl", ".lgl.", "..l.."];

export const CODE_BLOCK: Sprite = [
  "kkkkkkkk",
  "kSSSSSSk",
  "kSllSSSk",
  "kSSlllSk",
  "kSllSSSk",
  "kSSSSSSk",
  "kkkkkkkk",
];

export const HALLUCINATION: Sprite = [".pp.", "prrp", "prrp", ".pp."];

export const BUSH: Sprite = [
  "....gggg....",
  "..ggllllgg..",
  ".gglllllllg.",
  "gglllgllllgg",
  "glllggllglGg",
  "gGlllllllGGg",
  ".gGGlllGGGg.",
  "..gGGGGGGg..",
  "...gggggg...",
];

export const ROCK: Sprite = [
  "...ssss...",
  "..swwsss..",
  ".swsssssS.",
  "ssssssSSSS",
  "sSssSSSSSS",
  ".SSSSSSSd.",
  "..dddddd..",
];

export const SERVER: Sprite = [
  "kkkkkkkkkk",
  "kSSSSSSSSk",
  "kSdddddlSk",
  "kSSSSSSSSk",
  "kSddddlcSk",
  "kSSSSSSSSk",
  "kSdddddlSk",
  "kSSSSSSSSk",
  "kSddddclSk",
  "kSSSSSSSSk",
  "kSdddddlSk",
  "kSSSSSSSSk",
  "kddddddddk",
  "kkkkkkkkkk",
];

export const CRATE: Sprite = [
  "kkkkkkkkkk",
  "koooooooyk",
  "kodddddddk",
  "kkkkkkkkkk",
  "koooooooyk",
  "kodddddddk",
  "kkkkkkkkkk",
  "koooooooyk",
  "kodddddddk",
  "kkkkkkkkkk",
];

export const FLOWER: Sprite = [".r.r.", "rryrr", ".rrr.", "..g..", ".gg.."];

export const TUFT: Sprite = ["l.l.l.", ".lglg.", "gGgGgg"];

export const CABLE: Sprite = ["..dddd..", ".dSSSSd.", "dS.dd.Sd", "dS.dd.Sd", ".dSSSSd.", "..dddd.."];

export const PROPS: readonly Sprite[] = [BUSH, ROCK, SERVER, CRATE, FLOWER, TUFT, TUFT, FLOWER, CABLE];
