import { EVOLUTIONS, MAX_PASSIVES, MAX_WEAPONS, PASSIVES, WEAPONS, type PassiveId, type WeaponDefinition, type WeaponId } from "./content";
import type { ArenaState } from "./sim";

export const CARDS_PER_DRAFT = 3;

export interface CardChange {
  readonly label: string;
  readonly before: string;
  readonly after: string;
}

export type Card =
  | { readonly kind: "weapon"; readonly id: WeaponId; readonly toLevel: number; readonly recommended: boolean; readonly changes: readonly CardChange[] }
  | { readonly kind: "passive"; readonly id: PassiveId; readonly toLevel: number; readonly recommended: boolean; readonly changes: readonly CardChange[] }
  | { readonly kind: "evolve"; readonly id: WeaponId; readonly toLevel: 1; readonly recommended: boolean; readonly changes: readonly CardChange[] };

type Candidate = (
  | { readonly kind: "weapon"; readonly id: WeaponId; readonly toLevel: number }
  | { readonly kind: "passive"; readonly id: PassiveId; readonly toLevel: number }
  | { readonly kind: "evolve"; readonly id: WeaponId; readonly toLevel: 1 }
) & { readonly weight: number; readonly priority: number };

function weaponChanges(id: WeaponId, fromLevel: number, toLevel: number): CardChange[] {
  const levels = WEAPONS[id].levels;
  const after = levels[toLevel - 1];
  if (!after) {
    return [];
  }
  const before = fromLevel > 0 ? levels[fromLevel - 1] : undefined;
  const changes: CardChange[] = [];
  const add = (label: string, from: number | undefined, to: number, unit = "") => {
    if (from === to) {
      return;
    }
    changes.push({ label, before: from === undefined ? "-" : `${from}${unit}`, after: `${to}${unit}` });
  };
  add("Damage", before?.damage, after.damage);
  if (WEAPONS[id].kind !== "orbit") {
    add("Every", before ? Number((before.cooldown / 60).toFixed(2)) : undefined, Number((after.cooldown / 60).toFixed(2)), "s");
  }
  add(WEAPONS[id].kind === "orbit" ? "Blocks" : "Shots", before?.count, after.count);
  if (WEAPONS[id].kind === "beam" || WEAPONS[id].kind === "seeker") {
    add("Pierce", before?.pierce, after.pierce);
  }
  if (WEAPONS[id].kind === "pulse" || WEAPONS[id].kind === "orbit") {
    add("Radius", before?.radius, after.radius);
  }
  return changes;
}

function passiveChanges(id: PassiveId, fromLevel: number): CardChange[] {
  const passive = PASSIVES[id];
  const unit = passive.stat === "maxHealth" || passive.stat === "armor" ? "" : passive.stat === "regen" ? " HP/2s" : "%";
  const label: Record<typeof passive.stat, string> = {
    maxHealth: "Max HP",
    damage: "Damage",
    crit: "Crit chance",
    hallucination: "Hallucination",
    cooldown: "Cooldowns",
    pickup: "Pickup range",
    speed: "Move speed",
    regen: "Regen",
    armor: "Armor",
  };
  const show = (value: number) => (value > 0 && unit === "%" ? `+${value}${unit}` : `${value}${unit}`);
  return [{ label: label[passive.stat], before: show(passive.perLevel * fromLevel), after: show(passive.perLevel * (fromLevel + 1)) }];
}

function evolvedFrom(state: ArenaState, id: WeaponId): boolean {
  return EVOLUTIONS.some((evolution) => evolution.weapon === id && state.weapons.some((weapon) => weapon.id === evolution.result));
}

function candidates(state: ArenaState): Candidate[] {
  const list: Candidate[] = [];
  for (const evolution of EVOLUTIONS) {
    const owned = state.weapons.find((weapon) => weapon.id === evolution.weapon);
    const alreadyEvolved = state.weapons.some((weapon) => weapon.id === evolution.result);
    if (!alreadyEvolved && owned && owned.level >= WEAPONS[evolution.weapon].levels.length && (state.passives.get(evolution.passive) ?? 0) > 0) {
      list.push({ kind: "evolve", id: evolution.result, toLevel: 1, weight: 1000, priority: 100 });
    }
  }
  for (const id of Object.keys(WEAPONS) as WeaponId[]) {
    const definition: WeaponDefinition = WEAPONS[id];
    if (definition.evolved || definition.tier > state.tier || state.banished.has(id) || evolvedFrom(state, id)) {
      continue;
    }
    const owned = state.weapons.find((weapon) => weapon.id === id);
    if (owned) {
      if (owned.level < definition.levels.length) {
        list.push({ kind: "weapon", id, toLevel: owned.level + 1, weight: 30, priority: 60 + owned.level });
      }
    } else if (state.weapons.length < MAX_WEAPONS) {
      list.push({ kind: "weapon", id, toLevel: 1, weight: 22, priority: state.weapons.length < 3 ? 80 : 40 });
    }
  }
  for (const id of Object.keys(PASSIVES) as PassiveId[]) {
    const passive = PASSIVES[id];
    if (passive.tier > state.tier || state.banished.has(id)) {
      continue;
    }
    const owned = state.passives.get(id) ?? 0;
    if (owned >= passive.maxLevel || (owned === 0 && state.passives.size >= MAX_PASSIVES)) {
      continue;
    }
    const pairsWithOwned = EVOLUTIONS.some((evolution) => evolution.passive === id && state.weapons.some((weapon) => weapon.id === evolution.weapon));
    list.push({ kind: "passive", id, toLevel: owned + 1, weight: 18, priority: pairsWithOwned ? 70 : 30 + owned });
  }
  return list;
}

export function offerCards(state: ArenaState): Card[] {
  const pool = candidates(state);
  const picked: Candidate[] = [];
  while (picked.length < CARDS_PER_DRAFT && pool.length > 0) {
    const total = pool.reduce((sum, candidate) => sum + candidate.weight, 0);
    let roll = state.rng.intBelow(total);
    let index = 0;
    for (; index < pool.length - 1; index += 1) {
      const weight = pool[index]?.weight ?? 0;
      if (roll < weight) {
        break;
      }
      roll -= weight;
    }
    const [chosen] = pool.splice(index, 1);
    if (chosen) {
      picked.push(chosen);
    }
  }
  const best = picked.reduce((top, candidate, index) => ((picked[top]?.priority ?? -1) >= candidate.priority ? top : index), 0);
  return picked.map((candidate, index): Card => {
    const recommended = index === best;
    if (candidate.kind === "passive") {
      return { kind: "passive", id: candidate.id, toLevel: candidate.toLevel, recommended, changes: passiveChanges(candidate.id, candidate.toLevel - 1) };
    }
    if (candidate.kind === "evolve") {
      return { kind: "evolve", id: candidate.id, toLevel: 1, recommended, changes: weaponChanges(candidate.id, 0, 1) };
    }
    return { kind: "weapon", id: candidate.id, toLevel: candidate.toLevel, recommended, changes: weaponChanges(candidate.id, candidate.toLevel - 1, candidate.toLevel) };
  });
}

export function cardName(card: Card): string {
  return card.kind === "passive" ? PASSIVES[card.id].name : WEAPONS[card.id].name;
}

export function cardBlurb(card: Card): string {
  return card.kind === "passive" ? PASSIVES[card.id].blurb : WEAPONS[card.id].blurb;
}
