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
    game.pointer(point.x, point.y, false);
  });
  hudCanvas.addEventListener("pointerdown", (event) => {
    const point = toHud(event);
    game.pointer(point.x, point.y, true);
  });
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
  const loop = () => {
    game.frame();
    requestAnimationFrame(loop);
  };
  loop();
  Object.assign(window, { arena: game });
}

void boot();
