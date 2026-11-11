import { cueKey, scoreFor, type MusicCue } from "./score";

type StrudelModule = typeof import("@strudel/web");

let strudel: Promise<StrudelModule> | undefined;
let playing: string | null = null;
let queue: Promise<void> = Promise.resolve();

function loadStrudel(): Promise<StrudelModule> {
  strudel ??= import("@strudel/web").then(async (module) => {
    await module.initStrudel();
    return module;
  });
  return strudel;
}

export function setMusic(cue: MusicCue | null, volume = 1): void {
  const level = Math.round(Math.max(0, volume) * 100) / 100;
  const key = cue ? `${cueKey(cue)}@${level}` : null;
  if (key === playing) {
    return;
  }
  playing = key;
  queue = queue.then(() => (cue ? play(cue, level) : stop())).catch(() => undefined);
}

async function play(cue: MusicCue, level: number): Promise<void> {
  const { evaluate } = await loadStrudel();
  await evaluate(`${scoreFor(cue)}.postgain(${level})`);
}

async function stop(): Promise<void> {
  if (!strudel) {
    return;
  }
  const { hush } = await strudel;
  hush();
}
