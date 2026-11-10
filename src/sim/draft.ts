import { assertValidLoadout, type AnyLoadout } from "./loadout";
import { EVOLUTIONS, isEvolvedPart, PARTS, type PartId } from "./parts";
import { createRng } from "./rng";
import { SLOT_CAPACITY, unlockedSlots } from "./tiers";

export const OFFER_SIZE = 3;

export interface DraftRules {
  readonly rerolls: number;
  readonly banishes: number;
}

export const DEFAULT_DRAFT_RULES: DraftRules = { rerolls: 2, banishes: 1 };

export interface DraftState {
  readonly seed: number;
  readonly draws: number;
  readonly loadout: AnyLoadout;
  readonly offer: readonly PartId[];
  readonly rerollsLeft: number;
  readonly banishesLeft: number;
  readonly banished: readonly PartId[];
  readonly done: boolean;
}

export class DraftError extends RangeError {}

export function startDraft(seed: number, loadout: AnyLoadout, rules: DraftRules = DEFAULT_DRAFT_RULES): DraftState {
  assertValidLoadout(loadout);
  return dealOffer({
    seed: seed >>> 0,
    draws: 0,
    loadout,
    offer: [],
    rerollsLeft: rules.rerolls,
    banishesLeft: rules.banishes,
    banished: [],
    done: false,
  });
}

export function draftPool(loadout: AnyLoadout, banished: readonly PartId[]): PartId[] {
  const unlocked = new Set(unlockedSlots(loadout.tier));
  const used = new Map<string, number>();
  for (const id of loadout.parts) {
    const slot = PARTS[id].slot;
    used.set(slot, (used.get(slot) ?? 0) + 1);
  }
  return (Object.keys(PARTS) as PartId[]).filter((id) => {
    const slot = PARTS[id].slot;
    return (
      !isEvolvedPart(id) &&
      !banished.includes(id) &&
      !(loadout.parts as readonly PartId[]).includes(id) &&
      unlocked.has(slot) &&
      (used.get(slot) ?? 0) < SLOT_CAPACITY[slot]
    );
  });
}

export function pick(state: DraftState, index: number): DraftState {
  const id = cardAt(state, index);
  const loadout = applyEvolutions(withParts(state.loadout, [...state.loadout.parts, id]));
  return { ...state, loadout, offer: [], done: true };
}

export function skip(state: DraftState): DraftState {
  assertOpen(state);
  return { ...state, offer: [], done: true };
}

export function reroll(state: DraftState): DraftState {
  assertOpen(state);
  if (state.rerollsLeft <= 0) {
    throw new DraftError("No rerolls left");
  }
  return dealOffer({ ...state, rerollsLeft: state.rerollsLeft - 1 });
}

export function banish(state: DraftState, index: number): DraftState {
  const id = cardAt(state, index);
  if (state.banishesLeft <= 0) {
    throw new DraftError("No banishes left");
  }
  return dealOffer({ ...state, banishesLeft: state.banishesLeft - 1, banished: [...state.banished, id] });
}

export function applyEvolutions(loadout: AnyLoadout): AnyLoadout {
  let parts: PartId[] = [...loadout.parts];
  for (const { ingredients, result } of EVOLUTIONS) {
    if (ingredients.every((id) => parts.includes(id))) {
      const [first] = ingredients;
      parts = parts.flatMap((id) => (id === first ? [result] : ingredients.includes(id) ? [] : [id]));
    }
  }
  return withParts(loadout, parts);
}

function dealOffer(state: DraftState): DraftState {
  const pool = draftPool(state.loadout, state.banished);
  const rng = createRng(mixSeed(state.seed, state.draws));
  const offer: PartId[] = [];
  while (offer.length < OFFER_SIZE && pool.length > 0) {
    const [chosen] = pool.splice(rng.intBelow(pool.length), 1);
    if (chosen) {
      offer.push(chosen);
    }
  }
  return { ...state, draws: state.draws + 1, offer };
}

function cardAt(state: DraftState, index: number): PartId {
  assertOpen(state);
  const id = state.offer[index];
  if (id === undefined) {
    throw new DraftError(`No card at position ${index}`);
  }
  return id;
}

function assertOpen(state: DraftState): void {
  if (state.done) {
    throw new DraftError("This draft is finished");
  }
}

function withParts(loadout: AnyLoadout, parts: readonly PartId[]): AnyLoadout {
  const next = { ...loadout, parts };
  assertValidLoadout(next);
  return next as AnyLoadout;
}

function mixSeed(seed: number, draws: number): number {
  return (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(draws + 1, 0xc2b2ae35)) >>> 0;
}
