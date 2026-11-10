import { runBattle } from "./sim/battle";
import { buildAgent } from "./sim/loadout";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
const context = canvas?.getContext("2d");

if (canvas && context) {
  const player = buildAgent({ name: "Your Agent", tier: 2, parts: ["midBrain", "strictPrompt", "fewShotExamples"] });
  const rival = buildAgent({ name: "Hustlr Bot", tier: 2, parts: ["tinyBrain", "hotTemperature", "conversationBuffer"] });
  const result = runBattle(Date.now() >>> 0, player, rival);
  const winnerName = result.winner === "draw" ? "Nobody" : [player, rival][result.winner]?.name ?? "Nobody";

  context.fillStyle = "#e8e8ea";
  context.font = "16px ui-monospace, monospace";
  context.textAlign = "center";
  context.fillText("AGENT ARENA", canvas.width / 2, canvas.height / 2 - 20);
  context.fillText(`${winnerName} wins in ${result.ticks} ticks`, canvas.width / 2, canvas.height / 2 + 10);
}
