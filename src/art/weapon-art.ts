import type { WeaponId } from "../sim/arena/content";
import { beamSprite, BOLT, CODE_BLOCK, outlined, SEEKER } from "./arena-sprites";
import type { Sprite } from "./sprites";
import { CODE_MISSILE, NETWORK_MISSILE, TEAM_MISSILE } from "./tool-art";

export type WeaponStage = 0 | 1 | 2;
export const WEAPON_STAGES: readonly WeaponStage[] = [0, 1, 2];

export function weaponStage(level: number): WeaponStage {
  return level >= 5 ? 2 : level >= 3 ? 1 : 0;
}

function sparkle(sprite: Sprite): Sprite {
  const width = sprite[0]?.length ?? 0;
  return sprite.map((row, y) => (y === 0 ? `${row.slice(0, width - 1)}w` : y === 1 ? `${row.slice(0, width - 2)}w${row.slice(width - 1)}` : row));
}

export function staged(sprite: Sprite, stage: WeaponStage): Sprite {
  if (stage === 0) {
    return sprite;
  }
  if (stage === 1) {
    return outlined(sprite, "m");
  }
  return sparkle(outlined(outlined(sprite, "y"), "o"));
}

export const INTERPRETER: Sprite = [
  ".oooooooooooo.",
  "oyyyyyyyyyyyyo",
  "oyryoyly.yyyyo",
  "oooooooooooooo",
  "okkkkkkkkkkkko",
  "okyykkkkkkkkko",
  "okkyykkllllkko",
  "okkkyykkkkkkko",
  "okkyykklllkkko",
  "okyykkkkkkkkko",
  "okkkkkkkkkkkko",
  ".oooooooooooo.",
];

export const BRICK: Sprite = [
  "kkkkkkkkkkkk",
  "kooooooooook",
  "kowoooooooyk",
  "kooyoooooook",
  "kowooyyyyook",
  "kooooooooook",
  "kooyooooyook",
  "kkkkkkkkkkkk",
];

export const CURSOR: Sprite = [
  "kk.......",
  "kwk......",
  "kwwk.....",
  "kwwwk....",
  "kwwwwk...",
  "kwwwwwk..",
  "kwwwwwwk.",
  "kwwwkkkkk",
  "kwkkwk...",
  "kk.kwwk..",
  "....kwk..",
  ".....k...",
];

const SEARCH_DARTS: Readonly<Record<WeaponStage, Sprite>> = {
  0: beamSprite(18, 5, ["c", "m", "w"]),
  1: beamSprite(22, 7, ["c", "m", "w"]),
  2: beamSprite(26, 9, ["m", "y", "w"]),
};

export const RAG_DART: Sprite = beamSprite(30, 9, ["y", "l", "w"]);

export function weaponSprite(weapon: WeaponId, stage: WeaponStage): Sprite {
  switch (weapon) {
    case "prompt":
      return staged(BOLT, stage);
    case "webSearch":
      return SEARCH_DARTS[stage];
    case "ragSearch":
      return RAG_DART;
    case "subagents":
      return staged(SEEKER, stage);
    case "codeExec":
      return staged(CODE_BLOCK, stage);
    case "codeInterpreter":
      return outlined(INTERPRETER, "y");
    case "coderSubagent":
      return staged(CODE_MISSILE, stage);
    case "agentNetwork":
      return NETWORK_MISSILE;
    case "durableAgentTeam":
      return outlined(TEAM_MISSILE, "y");
    case "browser":
      return staged(CURSOR, stage);
    case "computerUse":
      return outlined(outlined(CURSOR, "m"), "c");
    case "shell":
      return staged(BRICK, stage);
    case "ciPipeline":
      return outlined(outlined(BRICK, "y"), "o");
    case "voice":
    case "fileReader":
    case "mapReduce":
    case "apiCall":
    case "mcpServer":
    case "scheduledJob":
    case "durableWorkflow":
      return [];
  }
}
