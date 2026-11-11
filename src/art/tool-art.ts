import type { Sprite } from "./sprites";

export const CODE_MISSILE: Sprite = [
  "....k....",
  "..kkokk..",
  ".kwooook.",
  ".kooyook.",
  "kooywyook",
  ".kooyook.",
  ".koooook.",
  "..kkokk..",
  "....k....",
];

export const NETWORK_MISSILE: Sprite = [
  ".....k.....",
  "...kkckk...",
  "..kwcccck..",
  ".kmccoccck.",
  ".kccooocck.",
  "kccoowoocck",
  ".kccooocck.",
  ".kcccoccck.",
  "..kccccck..",
  "...kkckk...",
  ".....k.....",
];

export const TEAM_MISSILE: Sprite = [
  "......k......",
  "...kkkykkk...",
  "..kywyyyyyk..",
  ".kywyyoyyyyk.",
  ".kyyoooooyyk.",
  ".kyyoowooyyk.",
  "kyyoowwwooyyk",
  ".kyyoowooyyk.",
  ".kyyoooooyyk.",
  ".kyyyyoyyyyk.",
  "..kyyyyyyyk..",
  "...kkkykkk...",
  "......k......",
];

export const CODER_DRONE: Sprite = [
  ".kwwwwwk.",
  ".kkkkkkk.",
  "kyyyyyyyk",
  "kyykykyyk",
  "kyyyyyyyk",
  "koooooook",
  ".kkkSkkk.",
  "....k....",
  ".........",
];

export const MINE: Sprite = [
  ".....kSk.....",
  "...kkkSkkk...",
  "..kSSSdSSSk..",
  ".kSSddwddSSk.",
  ".kSdwwkwwdSk.",
  "kkSdwwkwwdSkk",
  "SSdwwwkkkwdSS",
  "kkSdwwwwwdSkk",
  ".kSdwwwwwdSk.",
  ".kSSddwddSSk.",
  "..kSSSdSSSk..",
  "...kkkSkkk...",
  ".....kSk.....",
];

export const MINE_HOT: Sprite = [
  ".....krk.....",
  "...kkkykkk...",
  "..krrrdrrrk..",
  ".krrddwddrrk.",
  ".krdwwkwwdrk.",
  "kkrdwwkwwdrkk",
  "rrdwwwkkkwdrr",
  "kkrdwwwwwdrkk",
  ".krdwwwwwdrk.",
  ".krrddwddrrk.",
  "..krrrdrrrk..",
  "...kkkykkk...",
  ".....krk.....",
];

export const DURABLE_MINE: Sprite = [
  ".....kyk.....",
  "...kkkSkkk...",
  "..kyyydyyyk..",
  ".kyyddwddyyk.",
  ".kydwwkwwdyk.",
  "kkydwwkwwdykk",
  "yydwwwkkkwdyy",
  "kkydwwwwwdykk",
  ".kydwwwwwdyk.",
  ".kyyddwddyyk.",
  "..kyyydyyyk..",
  "...kkkSkkk...",
  ".....kyk.....",
];

export const DURABLE_MINE_HOT: Sprite = [
  ".....krk.....",
  "...kkkwkkk...",
  "..krrrdrrrk..",
  ".krrddwddrrk.",
  ".krdwwkwwdrk.",
  "kkrdwwkwwdrkk",
  "rrdwwwkkkwdrr",
  "kkrdwwwwwdrkk",
  ".krdwwwwwdrk.",
  ".krrddwddrrk.",
  "..krrrdrrrk..",
  "...kkkwkkk...",
  ".....krk.....",
];

export type RayLook = "fileReader" | "mapReduce";

export const RAY_PROFILES: Readonly<Record<RayLook, readonly string[]>> = {
  fileReader: ["r", "o", "y", "w", "y", "o", "r"],
  mapReduce: ["p", "r", "o", "y", "w", "w", "y", "o", "r", "p"],
};

export type BoltLook = "apiCall" | "mcpServer";

export const BOLT_PROFILES: Readonly<Record<BoltLook, readonly string[]>> = {
  apiCall: ["c", "m", "w", "m", "c"],
  mcpServer: ["o", "y", "w", "w", "y", "o"],
};
