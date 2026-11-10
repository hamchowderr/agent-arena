import { BALANCE_TARGETS, greedyPolicy, playRun, randomPolicy, stageReport, type DraftPolicy } from "../src/sim/run";

const RUNS = BALANCE_TARGETS.runs;

function report(label: string, policy: DraftPolicy): void {
  const runs = Array.from({ length: RUNS }, (_, seed) => playRun(seed, policy));
  const cleared = runs.filter((run) => run.cleared).length;
  console.log(`\n${label}: ${RUNS} runs, ${Math.floor((cleared * 100) / RUNS)}% reach IPO`);
  for (const stage of stageReport(runs)) {
    console.log(`  ${stage.tier}. ${stage.name.padEnd(16)} reached ${String(stage.reached).padStart(4)}  cleared ${String(stage.clearPercent).padStart(3)}%`);
  }
}

report("Greedy bot", greedyPolicy);
report("Random bot", randomPolicy);
