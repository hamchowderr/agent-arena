import { choose, createArena, reroll, skip, step, type ArenaState, type Input } from "./sim";

export const REPLAY_VERSION = 1;

export type Action =
  | { readonly kind: "step"; readonly input: Input }
  | { readonly kind: "choose"; readonly index: number }
  | { readonly kind: "reroll" }
  | { readonly kind: "skip" };

const INPUT_CODES = 18;
const CHOOSE_BASE = INPUT_CODES;
const CARD_SLOTS = 3;
const REROLL_CODE = CHOOSE_BASE + CARD_SLOTS;
const SKIP_CODE = REROLL_CODE + 1;
const MAX_VARINT_BYTES = 5;

interface Token {
  readonly code: number;
  count: number;
}

export interface Recording {
  readonly seed: number;
  readonly tokens: Token[];
}

export interface Replay {
  readonly seed: number;
  readonly finalTick: number;
  readonly check: number;
  readonly actions: readonly Action[];
}

export function startRecording(seed: number): Recording {
  return { seed: seed >>> 0, tokens: [] };
}

export function inputCode(input: Input): number {
  return ((input.moveX + 1) * 3 + (input.moveY + 1)) * 2 + (input.dash ? 1 : 0);
}

export function codeInput(code: number): Input {
  const dash = code % 2 === 1;
  const move = Math.trunc(code / 2);
  return { moveX: (Math.trunc(move / 3) - 1) as Input["moveX"], moveY: ((move % 3) - 1) as Input["moveY"], dash };
}

function actionCode(action: Action): number {
  switch (action.kind) {
    case "step":
      return inputCode(action.input);
    case "choose":
      return CHOOSE_BASE + action.index;
    case "reroll":
      return REROLL_CODE;
    case "skip":
      return SKIP_CODE;
  }
}

function codeAction(code: number): Action | null {
  if (code < INPUT_CODES) {
    return { kind: "step", input: codeInput(code) };
  }
  if (code < REROLL_CODE) {
    return { kind: "choose", index: code - CHOOSE_BASE };
  }
  if (code === REROLL_CODE) {
    return { kind: "reroll" };
  }
  return code === SKIP_CODE ? { kind: "skip" } : null;
}

function changes(state: ArenaState, action: Action): boolean {
  switch (action.kind) {
    case "step":
      return state.status === "playing";
    case "choose":
      return state.status === "levelUp" && action.index >= 0 && action.index < Math.min(CARD_SLOTS, state.cards.length);
    case "reroll":
      return state.status === "levelUp" && state.rerolls > 0;
    case "skip":
      return state.status === "levelUp" && state.skips > 0;
  }
}

function apply(state: ArenaState, action: Action): void {
  switch (action.kind) {
    case "step":
      step(state, action.input);
      return;
    case "choose":
      choose(state, action.index);
      return;
    case "reroll":
      reroll(state);
      return;
    case "skip":
      skip(state);
      return;
  }
}

export function act(state: ArenaState, recording: Recording | null, action: Action): boolean {
  if (!changes(state, action)) {
    return false;
  }
  apply(state, action);
  if (recording) {
    const code = actionCode(action);
    const last = recording.tokens[recording.tokens.length - 1];
    if (last && last.code === code && code < INPUT_CODES) {
      last.count += 1;
    } else {
      recording.tokens.push({ code, count: 1 });
    }
  }
  return true;
}

export function stateCheck(state: ArenaState): number {
  let hash = 2166136261;
  for (const value of [state.tick, state.kills, state.level, state.xp, state.bossesDown, state.player.x, state.player.y, state.player.health, state.enemies.length]) {
    hash = Math.imul(hash ^ (value | 0), 16777619) >>> 0;
  }
  return hash;
}

function writeVarint(bytes: number[], value: number): void {
  let rest = value >>> 0;
  while (rest >= 0x80) {
    bytes.push((rest & 0x7f) | 0x80);
    rest >>>= 7;
  }
  bytes.push(rest);
}

class Reader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  done(): boolean {
    return this.offset >= this.bytes.length;
  }

  byte(): number | null {
    const value = this.bytes[this.offset];
    this.offset += 1;
    return value ?? null;
  }

  varint(): number | null {
    let value = 0;
    for (let index = 0; index < MAX_VARINT_BYTES; index += 1) {
      const next = this.byte();
      if (next === null) {
        return null;
      }
      value += (next & 0x7f) * 2 ** (7 * index);
      if (next < 0x80) {
        return value > 0xffffffff ? null : value;
      }
    }
    return null;
  }
}

export function encodeReplay(recording: Recording, final: ArenaState): Uint8Array {
  const bytes: number[] = [REPLAY_VERSION];
  writeVarint(bytes, recording.seed);
  writeVarint(bytes, final.tick);
  writeVarint(bytes, stateCheck(final));
  for (const token of recording.tokens) {
    bytes.push(token.code);
    if (token.code < INPUT_CODES) {
      writeVarint(bytes, token.count - 1);
    }
  }
  return Uint8Array.from(bytes);
}

export function decodeReplay(bytes: Uint8Array, maxActions = 1 << 22): Replay | null {
  const reader = new Reader(bytes);
  if (reader.byte() !== REPLAY_VERSION) {
    return null;
  }
  const seed = reader.varint();
  const finalTick = reader.varint();
  const check = reader.varint();
  if (seed === null || finalTick === null || check === null) {
    return null;
  }
  const actions: Action[] = [];
  while (!reader.done()) {
    const code = reader.byte();
    const action = code === null ? null : codeAction(code);
    if (code === null || action === null) {
      return null;
    }
    const repeat = code < INPUT_CODES ? reader.varint() : 0;
    if (repeat === null || actions.length + repeat + 1 > maxActions) {
      return null;
    }
    for (let index = 0; index <= repeat; index += 1) {
      actions.push(action);
    }
  }
  return { seed, finalTick, check, actions };
}

export interface ReplayResult {
  readonly state: ArenaState;
  readonly matches: boolean;
}

export function replayMatches(replay: Replay, state: ArenaState): boolean {
  return state.tick === replay.finalTick && stateCheck(state) === replay.check;
}

export function playReplay(replay: Replay): ReplayResult {
  const state = createArena(replay.seed);
  for (const action of replay.actions) {
    act(state, null, action);
  }
  return { state, matches: replayMatches(replay, state) };
}
