import { createRng } from "./rng";

export interface AgentBuild {
  readonly name: string;
  readonly maxHealth: number;
  readonly attack: number;
  readonly ticksPerAction: number;
  readonly critPercent: number;
}

export interface BattleEvent {
  readonly tick: number;
  readonly actor: 0 | 1;
  readonly damage: number;
  readonly crit: boolean;
  readonly targetHealthAfter: number;
}

export interface BattleResult {
  readonly winner: 0 | 1 | "draw";
  readonly ticks: number;
  readonly events: readonly BattleEvent[];
}

export const MAX_BATTLE_TICKS = 60 * 90;
const CRIT_MULTIPLIER_PERCENT = 150;

export function runBattle(seed: number, left: AgentBuild, right: AgentBuild): BattleResult {
  assertValidBuild(left);
  assertValidBuild(right);

  const rng = createRng(seed);
  const builds = [left, right] as const;
  const health = [left.maxHealth, right.maxHealth];
  const cooldown = [left.ticksPerAction, right.ticksPerAction];
  const events: BattleEvent[] = [];

  for (let tick = 1; tick <= MAX_BATTLE_TICKS; tick += 1) {
    for (const actor of [0, 1] as const) {
      const remaining = (cooldown[actor] ?? 0) - 1;
      cooldown[actor] = remaining;
      if (remaining > 0) {
        continue;
      }
      cooldown[actor] = builds[actor].ticksPerAction;

      const target = actor === 0 ? 1 : 0;
      const crit = rng.chancePercent(builds[actor].critPercent);
      const damage = crit
        ? Math.floor((builds[actor].attack * CRIT_MULTIPLIER_PERCENT) / 100)
        : builds[actor].attack;
      const targetHealthAfter = Math.max(0, (health[target] ?? 0) - damage);
      health[target] = targetHealthAfter;
      events.push({ tick, actor, damage, crit, targetHealthAfter });

      if (targetHealthAfter === 0) {
        return { winner: actor, ticks: tick, events };
      }
    }
  }

  return { winner: "draw", ticks: MAX_BATTLE_TICKS, events };
}

function assertValidBuild(build: AgentBuild): void {
  const positiveIntegers: readonly (keyof AgentBuild)[] = ["maxHealth", "attack", "ticksPerAction"];
  for (const key of positiveIntegers) {
    const value = build[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
      throw new RangeError(`${build.name}.${key} must be a positive integer, got ${String(value)}`);
    }
  }
  if (!Number.isInteger(build.critPercent) || build.critPercent < 0 || build.critPercent > 100) {
    throw new RangeError(`${build.name}.critPercent must be an integer from 0 to 100, got ${build.critPercent}`);
  }
}
