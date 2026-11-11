import { readingSeconds, scenePlays, typedLength, type Scene, type SceneMode, type StoryLine } from "./story";

export interface StoryMemory {
  has(id: string): boolean;
  add(id: string): void;
}

export function memoryOf(seen: Iterable<string> = []): StoryMemory {
  const ids = new Set(seen);
  return { has: (id) => ids.has(id), add: (id) => void ids.add(id) };
}

export interface Speech {
  readonly scene: Scene;
  readonly line: StoryLine;
  readonly mode: SceneMode;
  readonly text: string;
  readonly shown: number;
  readonly typing: boolean;
  readonly age: number;
  readonly autoFill: number;
  readonly index: number;
  readonly count: number;
}

interface Playing {
  readonly scene: Scene;
  readonly lines: readonly StoryLine[];
  readonly mode: SceneMode;
  index: number;
  age: number;
}

export interface TextSource {
  readonly text: (line: StoryLine) => string;
  readonly spaced: () => boolean;
}

const MAX_QUEUED = 6;
export const SCENE_GAP_SECONDS = 2.5;

export class StoryPlayer {
  autoAdvance = false;
  private readonly queue: { readonly scene: Scene; readonly watching: boolean }[] = [];
  private playing: Playing | null = null;
  private rest = 0;

  constructor(
    private readonly memory: StoryMemory,
    private readonly source: TextSource,
  ) {}

  play(scene: Scene, watching = false): void {
    if (scenePlays(scene, this.memory.has(scene.id)).length === 0) {
      return;
    }
    if (this.queue.length >= MAX_QUEUED || this.queue.some((entry) => entry.scene.id === scene.id) || this.playing?.scene.id === scene.id) {
      return;
    }
    this.queue.push({ scene, watching });
    if (!this.playing && this.rest <= 0) {
      this.next();
    }
  }

  cut(scene: Scene): void {
    if (this.playing?.scene.id === scene.id || this.queue.some((entry) => entry.scene.id === scene.id)) {
      return;
    }
    this.queue.unshift({ scene, watching: false });
    if (this.playing?.mode !== "hold") {
      this.next();
    }
  }

  forget(stale: (id: string) => boolean): void {
    const kept = this.queue.filter((entry) => !stale(entry.scene.id));
    this.queue.length = 0;
    this.queue.push(...kept);
  }

  clear(): void {
    this.queue.length = 0;
    this.playing = null;
    this.rest = 0;
  }

  get holding(): boolean {
    return this.playing?.mode === "hold";
  }

  get busy(): boolean {
    return this.playing !== null || this.queue.length > 0;
  }

  get resting(): boolean {
    return this.playing === null && this.rest > 0;
  }

  get speech(): Speech | null {
    const playing = this.playing;
    const line = playing?.lines[playing.index];
    if (!playing || !line) {
      return null;
    }
    const text = this.source.text(line);
    const length = [...text].length;
    const shown = typedLength(length, playing.age);
    const typing = shown < length;
    const autoFill = playing.mode === "auto" || this.autoAdvance ? Math.min(1, playing.age / readingSeconds(text, this.source.spaced())) : 0;
    return { scene: playing.scene, line, mode: playing.mode, text, shown, typing, age: playing.age, autoFill, index: playing.index, count: playing.lines.length };
  }

  frame(seconds: number): void {
    const playing = this.playing;
    if (!playing) {
      this.rest = Math.max(0, this.rest - seconds);
      if (this.rest <= 0 && this.queue.length > 0) {
        this.next();
      }
      return;
    }
    playing.age += seconds;
    const speech = this.speech;
    if (speech && speech.autoFill >= 1) {
      this.nextLine();
    }
  }

  advance(): boolean {
    const speech = this.speech;
    const playing = this.playing;
    if (!speech || !playing || playing.mode !== "hold") {
      return false;
    }
    if (speech.typing) {
      playing.age = Math.max(playing.age, 10);
      return true;
    }
    this.nextLine();
    return true;
  }

  skip(): boolean {
    if (!this.holding) {
      return false;
    }
    this.next();
    return true;
  }

  toggleAuto(): boolean {
    this.autoAdvance = !this.autoAdvance;
    return this.autoAdvance;
  }

  private nextLine(): void {
    const playing = this.playing;
    if (!playing) {
      return;
    }
    playing.index += 1;
    playing.age = 0;
    if (playing.index >= playing.lines.length) {
      this.playing = null;
      this.rest = SCENE_GAP_SECONDS;
    }
  }

  private next(): void {
    this.playing = null;
    this.rest = 0;
    for (let entry = this.queue.shift(); entry; entry = this.queue.shift()) {
      const seen = this.memory.has(entry.scene.id);
      const lines = scenePlays(entry.scene, seen);
      if (!entry.watching) {
        this.memory.add(entry.scene.id);
      }
      if (lines.length > 0) {
        const mode: SceneMode = entry.watching || seen ? "auto" : entry.scene.mode;
        this.playing = { scene: entry.scene, lines, mode, index: 0, age: 0 };
        return;
      }
    }
  }
}
