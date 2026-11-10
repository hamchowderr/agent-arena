import { PAD, readPad } from "./game/controls";
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
  const { ArenaGame, HUD_HEIGHT, HUD_WIDTH, detectLocale } = await import("./game/arena-game");
  hudCanvas.width = HUD_WIDTH;
  hudCanvas.height = HUD_HEIGHT;
  const query = new URLSearchParams(window.location.search);
  const fixedSeed = Number(query.get("seed"));
  const wanted = query.get("lang");
  const game = new ArenaGame(worldCanvas, hud, {
    newSeed: () => (Number.isInteger(fixedSeed) && fixedSeed > 0 ? fixedSeed : (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0),
    now: () => performance.now(),
    onLocale: (code) => {
      document.documentElement.lang = code;
      if (code === "ja" || code === "zh-Hans") {
        loadPixelCjkFont();
      }
      saveLocale(code);
    },
    onScreen: (screen, state) => {
      hudCanvas.dataset["screen"] = screen;
      if (screen === "results") {
        const url = new URL(window.location.href);
        url.searchParams.set("seed", String(state.seed));
        window.history.replaceState(null, "", url);
      }
    },
  });
  await game.changeLocale(detectLocale([wanted, readSavedLocale(), ...navigator.languages]));
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
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
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
      } else if (button === PAD.start || button === PAD.back) {
        tap(game.screen === "title" ? "enter" : "escape");
      } else if (button === PAD.reroll) {
        tap("r");
      } else if (button === PAD.skip) {
        tap("x");
      } else if (button === PAD.left || button === PAD.right) {
        game.nudgeCard(button === PAD.left ? -1 : 1);
      }
    }
  };
  const loop = () => {
    pollPad();
    game.frame();
    requestAnimationFrame(loop);
  };
  loop();
  Object.assign(window, { arena: game });
}

void boot();
