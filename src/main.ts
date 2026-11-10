import { runBattle, type AgentBuild } from "./sim/battle";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
const context = canvas?.getContext("2d");

if (canvas && context) {
  const player: AgentBuild = { name: "Your Agent", maxHealth: 120, attack: 9, ticksPerAction: 30, critPercent: 10 };
  const rival: AgentBuild = { name: "Hustlr Bot", maxHealth: 80, attack: 4, ticksPerAction: 12, critPercent: 25 };
  const result = runBattle(Date.now() >>> 0, player, rival);
  const winnerName = result.winner === "draw" ? "Nobody" : [player, rival][result.winner]?.name ?? "Nobody";

  context.fillStyle = "#e8e8ea";
  context.font = "16px ui-monospace, monospace";
  context.textAlign = "center";
  context.fillText("AGENT ARENA", canvas.width / 2, canvas.height / 2 - 20);
  context.fillText(`${winnerName} wins in ${result.ticks} ticks`, canvas.width / 2, canvas.height / 2 + 10);
}
