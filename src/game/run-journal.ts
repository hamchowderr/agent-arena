import { decodeReplay, encodeReplay, type Recording, type Replay } from "../sim/arena/replay";
import type { ArenaState } from "../sim/arena/sim";
import { fromBase64Url, toBase64Url } from "./replay-link";

export { JOURNAL_KEY, UNFINISHED_KEY } from "./journal-keys";
export const JOURNAL_EVERY_FRAMES = 120;

export interface JournalNote {
  readonly screen: string;
  readonly slowestFrameMs: number;
  readonly savedAt: number;
}

export interface JournalEntry {
  readonly replay: Replay;
  readonly code: string;
  readonly note: JournalNote;
  readonly tier: number;
  readonly enemies: number;
}

export function journalEntry(recording: Recording, state: ArenaState, note: JournalNote): string {
  return JSON.stringify({
    code: toBase64Url(encodeReplay(recording, state)),
    status: state.status,
    tier: state.tier,
    enemies: state.enemies.length,
    ...note,
  });
}

export function readJournal(text: string | null): JournalEntry | null {
  if (!text) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const fields = parsed as Record<string, unknown>;
    const code = typeof fields["code"] === "string" ? fields["code"] : "";
    const bytes = fromBase64Url(code);
    const replay = bytes ? decodeReplay(bytes) : null;
    if (!replay) {
      return null;
    }
    const number = (key: string) => (typeof fields[key] === "number" ? (fields[key] as number) : 0);
    return {
      replay,
      code,
      tier: number("tier"),
      enemies: number("enemies"),
      note: {
        screen: typeof fields["screen"] === "string" ? fields["screen"] : "",
        slowestFrameMs: number("slowestFrameMs"),
        savedAt: number("savedAt"),
      },
    };
  } catch {
    return null;
  }
}
