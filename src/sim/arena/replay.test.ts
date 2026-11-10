import { describe, expect, it } from "vitest";
import { kitingBot } from "./bot";
import { seconds } from "./math";
import { act, codeInput, decodeReplay, encodeReplay, inputCode, playReplay, REPLAY_VERSION, startRecording, stateCheck, type Recording } from "./replay";
import { createArena, type ArenaState, type Input } from "./sim";

function recordBotRun(seed: number, maxTicks: number): { readonly state: ArenaState; readonly recording: Recording } {
  const state = createArena(seed);
  const recording = startRecording(seed);
  let decisions = 0;
  while (state.tick < maxTicks && (state.status === "playing" || state.status === "levelUp")) {
    if (state.status === "levelUp") {
      decisions += 1;
      if (decisions % 5 === 2 && state.rerolls > 0) {
        act(state, recording, { kind: "reroll" });
      } else if (decisions % 7 === 3 && state.skips > 0) {
        act(state, recording, { kind: "skip" });
      } else {
        act(state, recording, { kind: "choose", index: decisions % state.cards.length });
      }
      continue;
    }
    act(state, recording, { kind: "step", input: kitingBot(state) });
  }
  return { state, recording };
}

describe("replays", () => {
  it("gives every input its own code and reads it back", () => {
    const codes = new Set<number>();
    for (const moveX of [-1, 0, 1] as const) {
      for (const moveY of [-1, 0, 1] as const) {
        for (const dash of [false, true]) {
          const input: Input = { moveX, moveY, dash };
          codes.add(inputCode(input));
          expect(codeInput(inputCode(input))).toEqual(input);
        }
      }
    }
    expect(codes.size).toBe(18);
  });

  it("replays a recorded run to the exact same end state", () => {
    const { state, recording } = recordBotRun(1234, seconds(300));
    const replay = decodeReplay(encodeReplay(recording, state));
    expect(replay).not.toBeNull();
    if (!replay) {
      return;
    }
    expect(replay.seed).toBe(1234);
    const result = playReplay(replay);
    expect(result.matches).toBe(true);
    expect(result.state.tick).toBe(state.tick);
    expect(result.state.kills).toBe(state.kills);
    expect(result.state.level).toBe(state.level);
    expect(result.state.status).toBe(state.status);
    expect(stateCheck(result.state)).toBe(stateCheck(state));
  });

  it("replays a run that ends in death", () => {
    const state = createArena(77);
    const recording = startRecording(77);
    while (state.status !== "dead" && state.tick < seconds(900)) {
      if (state.status === "levelUp") {
        act(state, recording, { kind: "choose", index: 0 });
      } else {
        act(state, recording, { kind: "step", input: { moveX: 1, moveY: 0, dash: state.tick % 200 === 0 } });
      }
    }
    expect(state.status).toBe("dead");
    const replay = decodeReplay(encodeReplay(recording, state));
    expect(replay && playReplay(replay).state.status).toBe("dead");
    expect(replay && playReplay(replay).matches).toBe(true);
  });

  it("notices a replay that no longer matches the game", () => {
    const { state, recording } = recordBotRun(5, seconds(60));
    const replay = decodeReplay(encodeReplay(recording, state));
    expect(replay).not.toBeNull();
    if (replay) {
      expect(playReplay({ ...replay, actions: replay.actions.slice(0, -30) }).matches).toBe(false);
      expect(playReplay({ ...replay, check: replay.check ^ 1 }).matches).toBe(false);
    }
  });

  it("only records actions that changed the run", () => {
    const state = createArena(3);
    const recording = startRecording(3);
    expect(act(state, recording, { kind: "choose", index: 0 })).toBe(false);
    expect(act(state, recording, { kind: "reroll" })).toBe(false);
    expect(recording.tokens).toHaveLength(0);
    act(state, recording, { kind: "step", input: { moveX: 0, moveY: 0, dash: false } });
    act(state, recording, { kind: "step", input: { moveX: 0, moveY: 0, dash: false } });
    expect(recording.tokens).toEqual([{ code: inputCode({ moveX: 0, moveY: 0, dash: false }), count: 2 }]);
  });

  it("packs a five minute run into a few kilobytes", () => {
    const { state, recording } = recordBotRun(99, seconds(300));
    expect(encodeReplay(recording, state).length).toBeLessThan(16_000);
  });

  it("rejects broken or foreign data", () => {
    expect(decodeReplay(new Uint8Array())).toBeNull();
    expect(decodeReplay(Uint8Array.from([REPLAY_VERSION + 1, 1, 1, 1]))).toBeNull();
    expect(decodeReplay(Uint8Array.from([REPLAY_VERSION, 0x80]))).toBeNull();
    expect(decodeReplay(Uint8Array.from([REPLAY_VERSION, 1, 1, 1, 200]))).toBeNull();
    expect(decodeReplay(Uint8Array.from([REPLAY_VERSION, 1, 1, 1, 0, 0xff, 0xff, 0xff, 0x7f]), 1000)).toBeNull();
  });
});
