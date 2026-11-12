import { describe, expect, it } from "vitest";
import { kitingBot } from "./bot";
import { seconds } from "./math";
import { DEFAULT_LOADOUT } from "./content";
import { act, codeInput, decodeReplay, encodeReplay, inputCode, playReplay, REPLAY_VERSION, startRecording, stateCheck, type Action, type Recording } from "./replay";
import { createArena, type ArenaState, type Input } from "./sim";

function recordBotRun(seed: number, maxTicks: number, startWorld = 0): { readonly state: ArenaState; readonly recording: Recording } {
  const state = createArena(seed, startWorld);
  const recording = startRecording(seed, startWorld);
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

  it("replays a run that started at a later world from the main menu", () => {
    const { state, recording } = recordBotRun(4321, seconds(90), 2);
    const replay = decodeReplay(encodeReplay(recording, state));
    expect(replay?.startWorld).toBe(2);
    if (!replay) {
      return;
    }
    const result = playReplay(replay);
    expect(result.matches).toBe(true);
    expect(result.state.startWorld).toBe(2);
  });

  it("still reads links made before runs could start at a later world", () => {
    const { state, recording } = recordBotRun(99, seconds(20));
    const bytes = encodeReplay(recording, state);
    const firstVersion = Uint8Array.from([1, bytes[1] ?? 0, ...bytes.slice(5)]);
    expect(bytes[2]).toBe(0);
    const replay = decodeReplay(firstVersion);
    expect(replay?.startWorld).toBe(0);
    expect(replay && playReplay(replay).matches).toBe(true);
  });

  it("still reads links made before the loadout was picked before the run", () => {
    const { state, recording } = recordBotRun(99, seconds(20));
    const bytes = encodeReplay(recording, state);
    const secondVersion = Uint8Array.from([2, bytes[1] ?? 0, bytes[2] ?? 0, ...bytes.slice(5)]);
    const replay = decodeReplay(secondVersion);
    expect(replay?.loadout).toEqual(recording.loadout);
    expect(replay && playReplay(replay).matches).toBe(true);
  });

  it("still reads links made before runs opened on the starter crate", () => {
    const { state, recording } = recordBotRun(99, seconds(20));
    const bytes = encodeReplay(recording, state);
    const thirdVersion = Uint8Array.from([3, ...bytes.slice(1, 4), ...bytes.slice(5)]);
    const replay = decodeReplay(thirdVersion);
    expect(replay?.opening).toBe("none");
    expect(replay && playReplay(replay).matches).toBe(true);
  });

  it("reads links from when only world 1 opened on a crate", () => {
    const state = createArena(41, 0, DEFAULT_LOADOUT, "firstWorld");
    const recording = startRecording(41, 0, DEFAULT_LOADOUT, "firstWorld");
    const right: Action = { kind: "step", input: { moveX: 1, moveY: 0, dash: false } };
    while (state.tick < seconds(10) && state.status !== "dead") {
      act(state, recording, state.status === "levelUp" ? { kind: "choose", index: 0 } : right);
    }
    const bytes = encodeReplay(recording, state);
    bytes[0] = 4;
    const replay = decodeReplay(bytes);
    expect(replay?.opening).toBe("firstWorld");
    expect(replay && playReplay(replay).matches).toBe(true);
    bytes[4] = 2;
    expect(decodeReplay(bytes)).toBeNull();
  });

  it("replays a run that opens on the starter crate", () => {
    const state = createArena(41, 0, DEFAULT_LOADOUT, "everyWorld");
    const recording = startRecording(41, 0, DEFAULT_LOADOUT, "everyWorld");
    const right: Action = { kind: "step", input: { moveX: 1, moveY: 0, dash: false } };
    while (state.tick < seconds(30) && state.status !== "dead") {
      act(state, recording, state.status === "levelUp" ? { kind: "choose", index: 0 } : right);
    }
    const replay = decodeReplay(encodeReplay(recording, state));
    expect(replay?.opening).toBe("everyWorld");
    expect(replay && playReplay(replay).matches).toBe(true);
  });

  it("refuses an opening that doesn't exist", () => {
    const { state, recording } = recordBotRun(99, seconds(5));
    const bytes = encodeReplay(recording, state);
    bytes[4] = 3;
    expect(decodeReplay(bytes)).toBeNull();
  });

  it("refuses a loadout that doesn't exist", () => {
    const { state, recording } = recordBotRun(99, seconds(5));
    const bytes = encodeReplay(recording, state);
    bytes[3] = 99;
    expect(decodeReplay(bytes)).toBeNull();
  });

  it("refuses a start world that doesn't exist", () => {
    const { state, recording } = recordBotRun(99, seconds(5));
    const bytes = encodeReplay(recording, state);
    bytes[2] = 9;
    expect(decodeReplay(bytes)).toBeNull();
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
    expect(decodeReplay(Uint8Array.from([REPLAY_VERSION, 1, 1, 1, 0, 1, 0, 0xff, 0xff, 0xff, 0x7f]), 1000)).toBeNull();
  });
});
