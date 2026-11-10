import { describe, expect, it } from "vitest";
import { applyEvolutions, banish, draftPool, DraftError, OFFER_SIZE, pick, reroll, skip, startDraft } from "./draft";
import { buildAgent, type AnyLoadout } from "./loadout";
import { isEvolvedPart, PARTS } from "./parts";
import { SLOT_CAPACITY, unlockedSlots } from "./tiers";

const chatbot: AnyLoadout = { name: "Chatbot", tier: 2, parts: ["midBrain", "strictPrompt"] };
const toolUser: AnyLoadout = { name: "Tool user", tier: 4, parts: ["midBrain", "webSearch", "codeExec"] };

describe("startDraft", () => {
  it("offers the same cards for the same seed and loadout", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      expect(startDraft(seed, chatbot).offer).toEqual(startDraft(seed, chatbot).offer);
    }
  });

  it("offers 3 distinct cards that the loadout can still take", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const { offer } = startDraft(seed, chatbot);
      expect(offer).toHaveLength(OFFER_SIZE);
      expect(new Set(offer).size).toBe(OFFER_SIZE);
      for (const id of offer) {
        expect(unlockedSlots(chatbot.tier)).toContain(PARTS[id].slot);
        expect(chatbot.parts).not.toContain(id);
        expect(isEvolvedPart(id)).toBe(false);
      }
    }
  });

  it("varies the offer across seeds", () => {
    const offers = new Set(Array.from({ length: 50 }, (_, seed) => startDraft(seed, toolUser).offer.join()));
    expect(offers.size).toBeGreaterThan(10);
  });

  it("never offers a part for a full slot", () => {
    const pool = draftPool({ name: "Full brain", tier: 1, parts: ["midBrain"] }, []);
    expect(pool.some((id) => PARTS[id].slot === "brain")).toBe(false);
    for (const id of pool) {
      expect(SLOT_CAPACITY[PARTS[id].slot]).toBeGreaterThan(0);
    }
  });

  it("offers fewer cards when the pool runs dry", () => {
    const nearlyFull: AnyLoadout = { name: "Nearly full", tier: 1, parts: ["midBrain", "coldTemperature", "longContext"] };
    expect(new Set(startDraft(1, nearlyFull).offer)).toEqual(new Set(["strictPrompt", "hypePrompt"]));
  });
});

describe("draft actions", () => {
  it("adds the picked card to the loadout and ends the draft", () => {
    const state = startDraft(3, chatbot);
    const chosen = state.offer[1];
    const after = pick(state, 1);
    expect(after.done).toBe(true);
    expect(after.loadout.parts).toEqual([...chatbot.parts, chosen]);
    expect(() => buildAgent(after.loadout)).not.toThrow();
  });

  it("leaves the loadout alone on skip", () => {
    const after = skip(startDraft(3, chatbot));
    expect(after.done).toBe(true);
    expect(after.loadout).toEqual(chatbot);
  });

  it("deals a new offer on reroll and runs out", () => {
    const state = startDraft(9, toolUser, { rerolls: 1, banishes: 0 });
    const rerolled = reroll(state);
    expect(rerolled.rerollsLeft).toBe(0);
    expect(rerolled.draws).toBe(state.draws + 1);
    expect(reroll(state)).toEqual(rerolled);
    expect(() => reroll(rerolled)).toThrow(DraftError);
  });

  it("removes a banished card from every later offer", () => {
    let state = startDraft(4, toolUser, { rerolls: 20, banishes: 1 });
    const gone = state.offer[0];
    state = banish(state, 0);
    expect(state.banished).toEqual([gone]);
    for (let i = 0; i < 20; i += 1) {
      expect(state.offer).not.toContain(gone);
      state = reroll(state);
    }
    expect(() => banish(state, 0)).toThrow(/No banishes left/);
  });

  it("refuses actions on a finished draft or a missing card", () => {
    const state = startDraft(2, chatbot);
    expect(() => pick(state, 7)).toThrow(DraftError);
    const finished = skip(state);
    expect(() => pick(finished, 0)).toThrow(/finished/);
    expect(() => reroll(finished)).toThrow(/finished/);
  });
});

describe("evolutions", () => {
  it("turns Web search plus a conversation buffer into RAG", () => {
    const evolved = applyEvolutions({ name: "Searcher", tier: 3, parts: ["webSearch", "conversationBuffer", "midBrain"] });
    expect(evolved.parts).toEqual(["ragSearch", "midBrain"]);
  });

  it("turns Code exec plus Write the test into CI Pipeline when picked in a draft", () => {
    const state = startDraft(0, { ...toolUser, parts: [...toolUser.parts] });
    const forced = { ...state, offer: ["writeTheTest"] as const };
    const after = pick(forced, 0);
    expect(after.loadout.parts).toContain("ciPipeline");
    expect(after.loadout.parts).not.toContain("codeExec");
    expect(after.loadout.parts).not.toContain("writeTheTest");
  });

  it("makes the evolved part stronger than its ingredients alone", () => {
    const before = buildAgent({ name: "Before", tier: 4, parts: ["codeExec", "writeTheTest", "toolRouter"] });
    const after = buildAgent(applyEvolutions({ name: "After", tier: 4, parts: ["codeExec", "writeTheTest", "toolRouter"] }));
    expect(after.attack).toBeGreaterThan(before.attack);
  });
});
