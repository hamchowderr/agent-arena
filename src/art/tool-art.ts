import type { Sprite } from "./sprites";

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

export type RayLook = "fileReader" | "mapReduce";

export const RAY_PROFILES: Readonly<Record<RayLook, readonly string[]>> = {
  fileReader: ["r", "o", "y", "w", "y", "o", "r"],
  mapReduce: ["p", "r", "o", "y", "w", "w", "y", "o", "r", "p"],
};

export type BoltLook = "apiCall" | "mcpServer";

export const BOLT_PROFILES: Readonly<Record<BoltLook, readonly string[]>> = {
  apiCall: ["c", "m", "w", "m", "c"],
  mcpServer: ["y", "c", "m", "w", "w", "m", "c", "y"],
};
