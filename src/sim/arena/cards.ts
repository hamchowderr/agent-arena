import { EVOLUTIONS, MAX_PASSIVES, MAX_WEAPONS, PASSIVES, WEAPONS, type PassiveId, type PassiveStat, type WeaponDefinition, type WeaponId } from "./content";
import { BASE_CRIT, hallucinationPercent, maxHealth, statTotal, type ArenaState } from "./sim";

export const CARDS_PER_DRAFT = 3;

export type ChangeStat = PassiveStat | "health" | "every" | "shots" | "blocks" | "pierce" | "radius";

export type ChangeUnit = "plain" | "ticks" | "percent" | "bonusPercent" | "regen";

export interface CardChange {
  readonly stat: ChangeStat;
  readonly unit: ChangeUnit;
  readonly before: number | null;
  readonly after: number;
}

export type Card =
  | { readonly kind: "weapon"; readonly id: WeaponId; readonly toLevel: number; readonly recommended: boolean; readonly changes: readonly CardChange[] }
  | { readonly kind: "passive"; readonly id: PassiveId; readonly toLevel: number; readonly recommended: boolean; readonly changes: readonly CardChange[] }
  | { readonly kind: "evolve"; readonly id: WeaponId; readonly toLevel: 1; readonly recommended: boolean; readonly changes: readonly CardChange[] }
  | { readonly kind: "restore"; readonly id: "restore"; readonly toLevel: 1; readonly recommended: true; readonly changes: readonly CardChange[] };

export const RESTORE_PERCENT = 40;

export function restoreAmount(state: ArenaState): number {
  return Math.trunc((maxHealth(state) * RESTORE_PERCENT) / 100);
}

function restoreCard(state: ArenaState): Card {
  const before = state.player.health;
  return { kind: "restore", id: "restore", toLevel: 1, recommended: true, changes: [{ stat: "health", unit: "plain", before, after: Math.min(maxHealth(state), before + restoreAmount(state)) }] };
}

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
  const add = (stat: ChangeStat, from: number | undefined, to: number, unit: ChangeUnit = "plain") => {
    if (from === to) {
      return;
    }
    changes.push({ stat, unit, before: from ?? null, after: to });
  };
  add("damage", before?.damage, after.damage);
  if (WEAPONS[id].kind !== "orbit") {
    add("every", before?.cooldown, after.cooldown, "ticks");
  }
  add(WEAPONS[id].kind === "orbit" ? "blocks" : "shots", before?.count, after.count);
  if (WEAPONS[id].kind === "beam" || WEAPONS[id].kind === "seeker") {
    add("pierce", before?.pierce, after.pierce);
  }
  if (WEAPONS[id].kind === "pulse" || WEAPONS[id].kind === "orbit") {
    add("radius", before?.radius, after.radius);
  }
  return changes;
}

function passiveChanges(state: ArenaState, id: PassiveId, fromLevel: number): CardChange[] {
  const passive = PASSIVES[id];
  const base: Record<typeof passive.stat, number> = {
    maxHealth: maxHealth(state) - statTotal(state, "maxHealth"),
    damage: 0,
    crit: BASE_CRIT,
    hallucination: hallucinationPercent(state) - statTotal(state, "hallucination"),
    cooldown: 0,
    pickup: 0,
    speed: 0,
    regen: 0,
    armor: 0,
  };
  const start = base[passive.stat];
  const unit: ChangeUnit =
    passive.stat === "maxHealth" || passive.stat === "armor" ? "plain" : passive.stat === "regen" ? "regen" : start === 0 ? "bonusPercent" : "percent";
  return [{ stat: passive.stat, unit, before: start + passive.perLevel * fromLevel, after: start + passive.perLevel * (fromLevel + 1) }];
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
  if (pool.length === 0) {
    return [restoreCard(state)];
  }
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
      return { kind: "passive", id: candidate.id, toLevel: candidate.toLevel, recommended, changes: passiveChanges(state, candidate.id, candidate.toLevel - 1) };
    }
    if (candidate.kind === "evolve") {
      return { kind: "evolve", id: candidate.id, toLevel: 1, recommended, changes: weaponChanges(candidate.id, 0, 1) };
    }
    return { kind: "weapon", id: candidate.id, toLevel: candidate.toLevel, recommended, changes: weaponChanges(candidate.id, candidate.toLevel - 1, candidate.toLevel) };
  });
}
