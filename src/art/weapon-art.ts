import type { WeaponId } from "../sim/arena/content";
import { beamSprite, BOLT, CODE_BLOCK, outlined, RAG_BEAM, SEEKER } from "./arena-sprites";
import type { Sprite } from "./sprites";

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

const SEARCH_BEAMS: Readonly<Record<WeaponStage, Sprite>> = {
  0: beamSprite(40, 5, ["c", "m", "w"]),
  1: beamSprite(50, 7, ["c", "m", "w"]),
  2: beamSprite(60, 9, ["m", "y", "w"]),
};

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

export function weaponSprite(weapon: WeaponId, stage: WeaponStage): Sprite {
  switch (weapon) {
    case "prompt":
      return staged(BOLT, stage);
    case "webSearch":
      return SEARCH_BEAMS[stage];
    case "ragSearch":
      return RAG_BEAM;
    case "subagents":
      return staged(SEEKER, stage);
    case "codeExec":
      return staged(CODE_BLOCK, stage);
    case "codeInterpreter":
      return outlined(INTERPRETER, "y");
    case "shell":
    case "ciPipeline":
      return [];
  }
}
