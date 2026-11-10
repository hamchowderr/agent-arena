import { playMusic, stopMusic } from "./audio/music";
import { Game, HEIGHT, WIDTH } from "./game/app";
import type { Tier } from "./sim/tiers";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
const context = canvas?.getContext("2d");
const musicButton = document.querySelector<HTMLButtonElement>("#music");
let musicOn = false;
let currentTier: Tier = 1;

if (canvas && context) {
  canvas.width = WIDTH * 2;
  canvas.height = HEIGHT * 2;
  context.scale(2, 2);
  const game = new Game(context, {
    newSeed: () => (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0,
    onTierChange: (tier) => {
      currentTier = tier;
      if (musicOn) {
        void playMusic(tier);
      }
    },
  });

  canvas.addEventListener("click", (event) => {
    const box = canvas.getBoundingClientRect();
    game.click(((event.clientX - box.left) * WIDTH) / box.width, ((event.clientY - box.top) * HEIGHT) / box.height);
  });
  window.addEventListener("keydown", (event) => game.key(event.key));

  const loop = () => {
    game.frame();
    canvas.dataset["screen"] = game.state;
    requestAnimationFrame(loop);
  };
  loop();
}

musicButton?.addEventListener("click", () => {
  musicOn = !musicOn;
  musicButton.textContent = musicOn ? "Stop music" : "Play music";
  musicButton.setAttribute("aria-pressed", String(musicOn));
  void (musicOn ? playMusic(currentTier) : stopMusic());
});
