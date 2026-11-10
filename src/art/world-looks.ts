import type { Tier } from "../sim/tiers";
import { PALETTE } from "./palette";

export interface WorldLook {
  readonly ground: readonly [string, string, string, string];
  readonly fog: string;
  readonly faction: string;
  readonly boss: string;
}

export const WORLD_LOOKS: Readonly<Record<Tier, WorldLook>> = {
  1: { ground: ["#3f7a3a", "#4a8a40", "#356b33", "#6aa84a"], fog: "#1b2a2a", faction: "#e8603c", boss: PALETTE.p },
  2: { ground: ["#5a7a3a", "#6b8a44", "#4d6a32", "#9ab25a"], fog: "#2a2a1b", faction: "#a77ee0", boss: PALETTE.o },
  3: { ground: ["#3a6a6a", "#447a78", "#325a5c", "#6aa8a0"], fog: "#14222a", faction: "#e9a93a", boss: PALETTE.p },
  4: { ground: ["#5a4a6a", "#6a5a7a", "#4a3a5a", "#8a7aa8"], fog: "#1a1424", faction: "#2fb5ad", boss: PALETTE.o },
  5: { ground: ["#6a5a3a", "#7a6a44", "#5a4a32", "#b29a5a"], fog: "#2a2014", faction: "#e562c0", boss: PALETTE.p },
};
