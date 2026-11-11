import { PAD, readPad } from "./game/controls";
import { startFrameLoop } from "./game/frame-loop";
const worldCanvas = document.querySelector<HTMLCanvasElement>("#world");
const hudCanvas = document.querySelector<HTMLCanvasElement>("#hud");
const loadingNote = document.querySelector<HTMLElement>("#status");

const LOCALE_KEY = "agent-arena.locale";

function readSavedLocale(): string | null {
  try {
    return window.localStorage.getItem(LOCALE_KEY);
  } catch {
    return null;
  }
}

function saveLocale(code: string): void {
  try {
    window.localStorage.setItem(LOCALE_KEY, code);
  } catch {
    return;
  }
}

const STORY_KEY = "agent-arena.story.seen";

const saved = {
  read(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  write(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      return;
    }
  },
};

function storyMemory(fresh: boolean): { has(id: string): boolean; add(id: string): void } {
  const seen = new Set<string>();
  try {
    const saved: unknown = fresh ? [] : JSON.parse(window.localStorage.getItem(STORY_KEY) ?? "[]");
    if (Array.isArray(saved)) {
      saved.filter((id): id is string => typeof id === "string").forEach((id) => seen.add(id));
    }
  } catch {
    seen.clear();
  }
  return {
    has: (id) => seen.has(id),
    add: (id) => {
      seen.add(id);
      try {
        window.localStorage.setItem(STORY_KEY, JSON.stringify([...seen]));
      } catch {
        return;
      }
    },
  };
}

function loadPixelCjkFont(): void {
  if (document.querySelector("link[data-font=cjk]")) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=DotGothic16&display=swap";
  link.dataset["font"] = "cjk";
  link.addEventListener("load", () => void document.fonts.load('16px "DotGothic16"', "日本語"));
  document.head.append(link);
}

async function boot(): Promise<void> {
  const hud = hudCanvas?.getContext("2d");
  if (!worldCanvas || !hudCanvas || !hud) {
    return;
  }
  const { ArenaGame, HUD_HEIGHT, HUD_WIDTH, detectLocale, playBlip, postToXUrl, readReplayCode, replayCodeFrom, replayUrl } = await import("./game/arena-game");
  hudCanvas.width = HUD_WIDTH;
  hudCanvas.height = HUD_HEIGHT;
  const query = new URLSearchParams(window.location.search);
  const fixedSeed = Number(query.get("seed"));
  const wanted = query.get("lang");
  const game = new ArenaGame(worldCanvas, hud, {
    newSeed: () => (Number.isInteger(fixedSeed) && fixedSeed > 0 ? fixedSeed : (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0),
    now: () => performance.now(),
    storyMemory: storyMemory(query.get("story") === "fresh"),
    blip: playBlip,
    saved,
    openLink: (url) => {
      const tab = window.open(url, "_blank");
      if (tab) {
        tab.opener = null;
      }
    },
    onLocale: (code) => {
      document.documentElement.lang = code;
      if (code === "ja" || code === "zh-Hans") {
        loadPixelCjkFont();
      }
      saveLocale(code);
    },
    onScreen: (screen) => {
      hudCanvas.dataset["screen"] = screen;
    },
    onReplayCode: (seed, code) => {
      window.history.replaceState(null, "", replayUrl(window.location.href, seed, code));
    },
    share: async ({ target, seed, code, title, text }) => {
      const link = replayUrl(window.location.href, seed, code);
      if (target === "x") {
        const tab = window.open(postToXUrl(text, link), "_blank");
        if (tab) {
          tab.opener = null;
        }
        return tab ? "opened" : "failed";
      }
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title, text, url: link });
          return "shared";
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return "cancelled";
          }
        }
      }
      try {
        await navigator.clipboard.writeText(link);
        return "copied";
      } catch {
        return "failed";
      }
    },
  });
  await game.changeLocale(detectLocale([wanted, readSavedLocale(), ...navigator.languages]));
  const sharedCode = replayCodeFrom(window.location.hash);
  if (sharedCode !== null) {
    const replay = await readReplayCode(sharedCode);
    if (replay) {
      game.watch(replay, sharedCode);
    } else {
      game.notifyBrokenReplay();
    }
  }
  loadingNote?.remove();
  const toHud = (event: PointerEvent) => {
    const box = hudCanvas.getBoundingClientRect();
    return { x: ((event.clientX - box.left) * HUD_WIDTH) / box.width, y: ((event.clientY - box.top) * HUD_HEIGHT) / box.height };
  };
  hudCanvas.addEventListener("pointermove", (event) => {
    const point = toHud(event);
    game.touchMove(event.pointerId, point.x, point.y);
    game.pointer(point.x, point.y, false);
  });
  hudCanvas.addEventListener("pointerdown", (event) => {
    const point = toHud(event);
    if (event.pointerType !== "mouse" && game.touchStart(event.pointerId, point.x, point.y)) {
      hudCanvas.setPointerCapture(event.pointerId);
      return;
    }
    game.pointer(point.x, point.y, true);
  });
  const endTouch = (event: PointerEvent) => game.touchEnd(event.pointerId);
  hudCanvas.addEventListener("pointerup", endTouch);
  hudCanvas.addEventListener("pointercancel", endTouch);
  window.addEventListener("keydown", (event) => {
    if ([" ", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      game.keyDown(event.key);
    }
  });
  window.addEventListener("keyup", (event) => game.keyUp(event.key));
  window.addEventListener("blur", () => game.keyUp("*"));
  const tap = (key: string) => {
    game.keyDown(key);
    game.keyUp(key);
  };
  let padHeld: boolean[] = [];
  const pollPad = () => {
    const pad = [...(navigator.getGamepads?.() ?? [])].find((candidate) => candidate?.connected);
    if (!pad) {
      return;
    }
    const frame = readPad(pad, padHeld);
    padHeld = [...frame.held];
    game.padMove(frame.direction);
    for (const button of frame.pressed) {
      if (button === PAD.confirm) {
        game.confirm();
      } else if (button === PAD.back && game.skipTutorial()) {
        continue;
      } else if (button === PAD.back) {
        game.back();
      } else if (button === PAD.start) {
        tap(game.screen === "title" ? "enter" : "escape");
      } else if (button === PAD.reroll) {
        tap("r");
      } else if (button === PAD.skip) {
        tap(game.screen === "paused" ? "q" : "x");
      } else if (button === PAD.left || button === PAD.right) {
        game.nudgeCard(button === PAD.left ? -1 : 1);
      }
    }
  };
  startFrameLoop({
    tick: () => {
      pollPad();
      game.frame();
    },
    schedule: (next) => requestAnimationFrame(next),
    onError: (error, failures) => {
      if (failures === 1) {
        console.error(error);
      }
      game.recoverFromFrameError(failures);
    },
  });
  Object.assign(window, { arena: game });
}

void boot();
