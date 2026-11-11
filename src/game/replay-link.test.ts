import { describe, expect, it } from "vitest";
import { kitingBot } from "../sim/arena/bot";
import { seconds } from "../sim/arena/math";
import { act, playReplay, startRecording } from "../sim/arena/replay";
import { createArena } from "../sim/arena/sim";
import { fromBase64Url, postToXUrl, readReplayCode, replayCode, replayCodeFrom, replayUrl, toBase64Url } from "./replay-link";

describe("replay links", () => {
  it("round-trips bytes through base64url of every length", () => {
    for (let length = 0; length < 40; length += 1) {
      const bytes = Uint8Array.from({ length }, (_, index) => (index * 97 + length * 13) & 255);
      const code = toBase64Url(bytes);
      expect(code).toMatch(/^[A-Za-z0-9_-]*$/);
      expect(fromBase64Url(code)).toEqual(bytes);
    }
    expect(fromBase64Url("a")).toBeNull();
    expect(fromBase64Url("ab+c")).toBeNull();
  });

  it("turns a run into a link that replays it exactly", async () => {
    const state = createArena(2024);
    const recording = startRecording(2024);
    while (state.tick < seconds(180) && state.status !== "dead") {
      if (state.status === "levelUp") {
        act(state, recording, { kind: "choose", index: 0 });
      } else {
        act(state, recording, { kind: "step", input: kitingBot(state) });
      }
    }
    const code = await replayCode(recording, state);
    const link = replayUrl("https://arena.chowderr.dev/?lang=ja#old", state.seed, code);
    expect(link.startsWith("https://arena.chowderr.dev/?seed=2024#replay=")).toBe(true);
    expect(link.length).toBeLessThan(8000);
    const read = await readReplayCode(replayCodeFrom(new URL(link).hash) ?? "");
    expect(read).not.toBeNull();
    if (read) {
      const result = playReplay(read);
      expect(result.matches).toBe(true);
      expect(result.state.kills).toBe(state.kills);
    }
  });

  it("refuses links that are not replays", async () => {
    expect(await readReplayCode("")).toBeNull();
    expect(await readReplayCode("not*base64")).toBeNull();
    expect(await readReplayCode("AAAAAAAA")).toBeNull();
    expect(replayCodeFrom("#lang=en")).toBeNull();
  });

  it("builds an X post link that carries the replay", () => {
    const url = new URL(postToXUrl("I lasted 3:00", "https://example.test/?seed=1#replay=abc"));
    expect(url.origin).toBe("https://x.com");
    expect(url.searchParams.get("url")).toBe("https://example.test/?seed=1#replay=abc");
    expect(url.searchParams.get("text")).toBe("I lasted 3:00");
  });
});
