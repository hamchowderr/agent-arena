import { kitingBot, pickRecommended } from "../src/sim/arena/bot";
import { seconds } from "../src/sim/arena/math";
import { createArena, elapsedSeconds, step } from "../src/sim/arena/sim";

const environment = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const RUNS = Number(environment["RUNS"] ?? 20);
const CHECKPOINTS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const alive = CHECKPOINTS.map(() => 0);
const levels = CHECKPOINTS.map(() => 0);
const firstLevelUps = [0, 0, 0, 0, 0];
const counted = [0, 0, 0, 0, 0];
for (let seed = 1; seed <= RUNS; seed += 1) {
  const state = createArena(seed);
  let mark = 0;
  let ups = 0;
  while (state.tick < seconds(125) && (state.status === "playing" || state.status === "levelUp")) {
    if (state.status === "levelUp") {
      if (ups < firstLevelUps.length) {
        firstLevelUps[ups] = (firstLevelUps[ups] ?? 0) + state.tick / 60;
        counted[ups] = (counted[ups] ?? 0) + 1;
      }
      ups += 1;
      pickRecommended(state);
      continue;
    }
    step(state, kitingBot(state));
    const checkpoint = CHECKPOINTS[mark];
    if (checkpoint !== undefined && elapsedSeconds(state) >= checkpoint) {
      alive[mark] = (alive[mark] ?? 0) + state.enemies.length;
      levels[mark] = (levels[mark] ?? 0) + state.level;
      mark += 1;
    }
  }
}
console.log("second\talive\tlevel");
CHECKPOINTS.forEach((second, index) => console.log(`${second}s\t${Math.round((alive[index] ?? 0) / RUNS)}\t${((levels[index] ?? 0) / RUNS).toFixed(1)}`));
console.log(`level-ups at: ${firstLevelUps.map((sum, index) => `${(sum / Math.max(1, counted[index] ?? 1)).toFixed(1)}s`).join(", ")}`);
