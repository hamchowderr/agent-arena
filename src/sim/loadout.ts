import type { AgentBuild } from "./battle";
import { PARTS, type PartEffect, type PartId, type PartsForSlot } from "./parts";
import { isTier, SLOT_CAPACITY, tierOf, unlockedSlots, type SlotId, type SlotsUpTo, type Tier } from "./tiers";

export interface Loadout<T extends Tier = Tier> {
  readonly name: string;
  readonly tier: T;
  readonly parts: readonly PartsForSlot<SlotsUpTo<T>>[];
}

export type AnyLoadout = { [T in Tier]: Loadout<T> }[Tier];

export const RAW_LLM_BASE = {
  maxHealth: 100,
  attack: 6,
  ticksPerAction: 30,
  critPercent: 5,
  hallucinationPercent: 30,
} as const;

export const HEALTH_PER_TIER = 20;
export const UNROUTED_TOOL_HALLUCINATION = 5;
const MIN_TICKS_PER_ACTION = 6;

export class LoadoutError extends RangeError {}

export function buildAgent(loadout: AnyLoadout): AgentBuild {
  assertValidLoadout(loadout);

  let maxHealth: number = RAW_LLM_BASE.maxHealth + HEALTH_PER_TIER * (loadout.tier - 1);
  let attack: number = RAW_LLM_BASE.attack;
  let ticksPerAction: number = RAW_LLM_BASE.ticksPerAction;
  let critPercent: number = RAW_LLM_BASE.critPercent;
  let hallucinationPercent: number = RAW_LLM_BASE.hallucinationPercent;

  for (const id of loadout.parts) {
    const effect: PartEffect = PARTS[id].effect;
    maxHealth += effect.health ?? 0;
    attack += effect.attack ?? 0;
    ticksPerAction -= effect.speed ?? 0;
    critPercent += effect.crit ?? 0;
    hallucinationPercent += effect.hallucination ?? 0;
  }

  const slots = slotCounts(loadout.parts);
  if ((slots.get("toolRouter") ?? 0) === 0) {
    hallucinationPercent += UNROUTED_TOOL_HALLUCINATION * (slots.get("tool") ?? 0);
  }

  return {
    name: loadout.name,
    maxHealth: Math.max(1, maxHealth),
    attack: Math.max(1, attack),
    ticksPerAction: Math.max(MIN_TICKS_PER_ACTION, ticksPerAction),
    critPercent: clampPercent(critPercent),
    hallucinationPercent: clampPercent(hallucinationPercent),
  };
}

export function assertValidLoadout(loadout: { readonly name: string; readonly tier: number; readonly parts: readonly string[] }): void {
  if (!isTier(loadout.tier)) {
    throw new LoadoutError(`${loadout.name}: tier must be 1 to 5, got ${loadout.tier}`);
  }
  const unlocked = new Set<SlotId>(unlockedSlots(loadout.tier));
  for (const id of loadout.parts) {
    if (!isPartId(id)) {
      throw new LoadoutError(`${loadout.name}: unknown part ${id}`);
    }
    const slot = PARTS[id].slot;
    if (!unlocked.has(slot)) {
      throw new LoadoutError(`${loadout.name}: ${id} needs tier ${tierOf(slot)}, agent is tier ${loadout.tier}`);
    }
  }
  for (const [slot, count] of slotCounts(loadout.parts as readonly PartId[])) {
    if (count > SLOT_CAPACITY[slot]) {
      throw new LoadoutError(`${loadout.name}: ${slot} holds ${SLOT_CAPACITY[slot]}, got ${count}`);
    }
  }
}

function slotCounts(parts: readonly PartId[]): Map<SlotId, number> {
  const counts = new Map<SlotId, number>();
  for (const id of parts) {
    const slot = PARTS[id].slot;
    counts.set(slot, (counts.get(slot) ?? 0) + 1);
  }
  return counts;
}

function isPartId(id: string): id is PartId {
  return Object.hasOwn(PARTS, id);
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}
