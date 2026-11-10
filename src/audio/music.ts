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

export function setMusic(cue: MusicCue | null): void {
  const key = cue ? cueKey(cue) : null;
  if (key === playing) {
    return;
  }
  playing = key;
  queue = queue.then(() => (cue ? play(cue) : stop())).catch(() => undefined);
}

async function play(cue: MusicCue): Promise<void> {
  const { evaluate } = await loadStrudel();
  await evaluate(scoreFor(cue));
}

async function stop(): Promise<void> {
  if (!strudel) {
    return;
  }
  const { hush } = await strudel;
  hush();
}
