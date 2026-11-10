import type { AgentBuild } from "../sim/battle";
import { PARTS, type PartEffect, type PartId } from "../sim/parts";
import type { SlotId } from "../sim/tiers";

const EFFECT_LABELS: readonly [keyof PartEffect, string][] = [
  ["attack", "ATK"],
  ["health", "HP"],
  ["speed", "SPD"],
  ["crit", "CRIT%"],
  ["hallucination", "HALL%"],
];

export function describeEffect(id: PartId): string {
  const effect: PartEffect = PARTS[id].effect;
  const parts = EFFECT_LABELS.flatMap(([key, label]) => {
    const value = effect[key];
    return value === undefined || value === 0 ? [] : [`${value > 0 ? "+" : ""}${value} ${label}`];
  });
  return parts.length > 0 ? parts.join("  ") : "Routes tool calls";
}

export function slotLabel(slot: SlotId): string {
  return slot.replace(/([A-Z])/g, " $1").replace(/^./, (first) => first.toUpperCase());
}

export function describeBuild(build: AgentBuild): string {
  return `HP ${build.maxHealth}  ATK ${build.attack}  SPD ${build.ticksPerAction}  CRIT ${build.critPercent}%  HALL ${build.hallucinationPercent}%`;
}
