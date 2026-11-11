import type { CardChange, Card } from "../sim/arena/cards";
import { EVOLUTIONS, MERGES, type PassiveId, type WeaponId, type World, type WorldId } from "../sim/arena/content";
import type { Killer } from "../sim/arena/sim";
import type { Tier } from "../sim/tiers";
import { t } from "../i18n";

export function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function tierName(tier: Tier): string {
  return t(`tier.${tier}.name`);
}

export function tierStage(tier: Tier): string {
  return t(`tier.${tier}.stage`);
}

export function tierLabel(tier: Tier): string {
  return t("tier.label", { name: tierName(tier), stage: tierStage(tier) });
}

export function weaponName(id: WeaponId): string {
  return t(`weapon.${id}.name`);
}

export function passiveName(id: PassiveId): string {
  return t(`passive.${id}.name`);
}

export function cardName(card: Card): string {
  return card.kind === "restore" ? t("card.restore.name") : card.kind === "passive" ? passiveName(card.id) : weaponName(card.id);
}

export function cardBlurb(card: Card): string {
  return card.kind === "restore" ? t("card.restore.blurb") : card.kind === "passive" ? t(`passive.${card.id}.blurb`) : t(`weapon.${card.id}.blurb`);
}

export function rivalName(world: World | WorldId): string {
  return t(`world.${typeof world === "string" ? world : world.id}.rival`);
}

export function bossName(world: World | WorldId): string {
  return t(`world.${typeof world === "string" ? world : world.id}.boss`);
}

export function bossPitch(world: World | WorldId): string {
  return t(`world.${typeof world === "string" ? world : world.id}.pitch`);
}

export function killerName(killer: Killer | null): string {
  if (!killer) {
    return t("results.swarm");
  }
  if (killer.enemy === "boss") {
    return bossName(killer.world);
  }
  return t("killer.enemy", { rival: rivalName(killer.world), enemy: t(`enemy.${killer.enemy}`) });
}

export function changeLabel(change: CardChange): string {
  return t(`stat.${change.stat}`);
}

export function changeValue(change: CardChange, value: number | null): string {
  if (value === null) {
    return "-";
  }
  switch (change.unit) {
    case "plain":
      return String(Math.max(0, value));
    case "ticks":
      return t("unit.seconds", { value: Number((value / 60).toFixed(2)) });
    case "percent":
      return `${Math.max(0, value)}%`;
    case "bonusPercent":
      return value > 0 ? `+${value}%` : `${value}%`;
    case "regen":
      return t("unit.regen", { value: Math.max(0, value) });
  }
}

export function abbreviation(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(" ").filter(Boolean);
  const first = [...(words[0] ?? "?")];
  const second = words[1];
  const letters = second ? `${first[0] ?? ""}${[...second][0] ?? ""}` : first.slice(0, 2).join("");
  return letters.toLocaleUpperCase();
}

export function compact(value: number): string {
  return value >= 10000 ? t("unit.thousands", { value: (value / 1000).toFixed(1) }) : String(value);
}

function evolutionNote(card: Card): string | null {
  if (card.kind === "restore") {
    return null;
  }
  if (card.kind === "passive") {
    const notes = EVOLUTIONS.filter((entry) => entry.passive === card.id).map((evolution) =>
      t("story.part.passiveEvolves", { weapon: weaponName(evolution.weapon), result: weaponName(evolution.result) }),
    );
    return notes.length > 0 ? notes.join(" ") : null;
  }
  const notes: string[] = [];
  const from = EVOLUTIONS.find((entry) => entry.result === card.id);
  if (from) {
    notes.push(t("story.part.evolved", { weapon: weaponName(from.weapon), passive: passiveName(from.passive) }));
  }
  const merged = MERGES.find((entry) => entry.result === card.id);
  if (merged) {
    notes.push(t("story.part.merged", { first: weaponName(merged.weapons[0]), second: weaponName(merged.weapons[1]) }));
  }
  const into = EVOLUTIONS.find((entry) => entry.weapon === card.id);
  if (into) {
    notes.push(t("story.part.weaponEvolves", { passive: passiveName(into.passive), result: weaponName(into.result) }));
  }
  const merge = MERGES.find((entry) => entry.weapons.includes(card.id));
  const partner = merge?.weapons.find((id) => id !== card.id);
  if (merge && partner) {
    notes.push(t("story.part.weaponMerges", { partner: weaponName(partner), result: weaponName(merge.result) }));
  }
  return notes.length > 0 ? notes.join(" ") : null;
}

export function partGuide(card: Card): string {
  const guide = card.kind === "restore" ? t("card.restore.guide") : card.kind === "passive" ? t(`passive.${card.id}.guide`) : t(`weapon.${card.id}.guide`);
  const note = evolutionNote(card);
  return note ? `${guide} ${note}` : guide;
}
