import { describe, expect, it } from "vitest";
import { kitingBot } from "../sim/arena/bot";
import { act, playReplay, startRecording } from "../sim/arena/replay";
import { createArena } from "../sim/arena/sim";
import { journalEntry, readJournal } from "./run-journal";

function playedRun(ticks: number) {
  const state = createArena(77);
  const recording = startRecording(77);
  while (state.tick < ticks) {
    if (state.status === "levelUp") {
      const recommended = state.cards.findIndex((card) => card.recommended);
      act(state, recording, { kind: "choose", index: Math.max(0, recommended) });
      continue;
    }
    act(state, recording, { kind: "step", input: kitingBot(state) });
  }
  return { state, recording };
}

describe("run journal", () => {
  it("brings back a run cut off mid-play so it replays to the same moment", () => {
    const { state, recording } = playedRun(3000);
    const entry = readJournal(journalEntry(recording, state, { screen: "run", slowestFrameMs: 40, savedAt: 1 }));
    if (!entry) {
      throw new Error("journal did not read back");
    }
    const result = playReplay(entry.replay);
    expect(result.matches).toBe(true);
    expect(result.state.tick).toBe(3000);
    expect(entry.note.screen).toBe("run");
  });

  it("ignores an empty or damaged journal", () => {
    expect(readJournal(null)).toBeNull();
    expect(readJournal("")).toBeNull();
    expect(readJournal("{not json")).toBeNull();
    expect(readJournal(JSON.stringify({ code: "!!" }))).toBeNull();
  });
});
