import type { Tier } from "../sim/tiers";
import { scoreFor } from "./score";

type StrudelModule = typeof import("@strudel/web");

let strudel: Promise<StrudelModule> | undefined;

function loadStrudel(): Promise<StrudelModule> {
  strudel ??= import("@strudel/web").then(async (module) => {
    await module.initStrudel();
    return module;
  });
  return strudel;
}

export async function playMusic(tier: Tier): Promise<void> {
  const { evaluate } = await loadStrudel();
  await evaluate(scoreFor(tier));
}

export async function stopMusic(): Promise<void> {
  if (!strudel) {
    return;
  }
  const { hush } = await strudel;
  hush();
}
