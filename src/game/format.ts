import { PASSIVES, WEAPONS, type PassiveId, type WeaponId } from "../sim/arena/content";
import { TIERS, type Tier } from "../sim/tiers";

export function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function tierLabel(tier: Tier): string {
  const entry = TIERS.find((candidate) => candidate.tier === tier);
  return entry ? `${entry.name} · ${entry.stage}` : `Tier ${tier}`;
}

export function weaponName(id: WeaponId): string {
  return WEAPONS[id].name;
}

export function passiveName(id: PassiveId): string {
  return PASSIVES[id].name;
}

export function abbreviation(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(" ").filter(Boolean);
  const first = words[0] ?? "?";
  const second = words[1];
  return second ? `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase() : first.slice(0, 2).toUpperCase();
}

export function compact(value: number): string {
  return value >= 10000 ? `${(value / 1000).toFixed(1)}K` : String(value);
}
