import { playBotRun } from "../src/sim/arena/bot";
import { seconds } from "../src/sim/arena/math";
import { elapsedSeconds } from "../src/sim/arena/sim";

const environment = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const RUNS = Number(environment["RUNS"] ?? 20);
const rows: string[] = [];
let bossTotal = 0;
let secondsTotal = 0;
for (let seed = 1; seed <= RUNS; seed += 1) {
  const { state } = playBotRun(seed, seconds(720));
  bossTotal += state.bossesDown;
  secondsTotal += elapsedSeconds(state);
  rows.push(`${seed}\t${state.status}\t${elapsedSeconds(state)}s\tlv${state.level}\tkills ${state.kills}\tbosses ${state.bossesDown}\t${state.killedBy ?? ""}\t${state.weapons.map((weapon) => `${weapon.id}${weapon.level}`).join(",")}`);
}
console.log(rows.slice(0, 12).join("\n"));
console.log(`avg survival ${Math.round(secondsTotal / RUNS)}s, avg bosses ${(bossTotal / RUNS).toFixed(2)}`);
