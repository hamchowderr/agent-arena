export const TIERS = [
  { tier: 1, name: "Raw LLM", stage: "Pre-seed", slots: ["brain", "temperature", "contextWindow", "systemPrompt"] },
  { tier: 2, name: "Chatbot", stage: "Seed", slots: ["shortTermMemory", "fewShot"] },
  { tier: 3, name: "Tool user", stage: "Series A", slots: ["tool", "toolRouter", "mcpConnector"] },
  { tier: 4, name: "Agent", stage: "Series B", slots: ["planner", "reflection", "longTermMemory", "skill"] },
  {
    tier: 5,
    name: "Harnessed agent",
    stage: "IPO",
    slots: ["loopRunner", "guardrails", "sandbox", "hooks", "contextManager", "subagents", "verifier", "traces"],
  },
] as const;

type TierEntry = (typeof TIERS)[number];

export type Tier = TierEntry["tier"];

export type SlotId = TierEntry["slots"][number];

export type TiersUpTo<T extends Tier> = T extends 1
  ? 1
  : T extends 2
    ? 1 | 2
    : T extends 3
      ? 1 | 2 | 3
      : T extends 4
        ? 1 | 2 | 3 | 4
        : Tier;

export type SlotsUpTo<T extends Tier> = Extract<TierEntry, { tier: TiersUpTo<T> }>["slots"][number];

export const SLOT_CAPACITY: Readonly<Record<SlotId, number>> = {
  brain: 1,
  temperature: 1,
  contextWindow: 1,
  systemPrompt: 1,
  shortTermMemory: 1,
  fewShot: 1,
  tool: 4,
  toolRouter: 1,
  mcpConnector: 2,
  planner: 1,
  reflection: 1,
  longTermMemory: 1,
  skill: 2,
  loopRunner: 1,
  guardrails: 1,
  sandbox: 1,
  hooks: 1,
  contextManager: 1,
  subagents: 1,
  verifier: 1,
  traces: 1,
};

export function tierOf(slot: SlotId): Tier {
  const entry = TIERS.find((candidate) => (candidate.slots as readonly SlotId[]).includes(slot));
  if (!entry) {
    throw new RangeError(`Unknown slot ${slot}`);
  }
  return entry.tier;
}

export function unlockedSlots(tier: Tier): readonly SlotId[] {
  return TIERS.filter((entry) => entry.tier <= tier).flatMap((entry) => entry.slots);
}

export function isTier(value: number): value is Tier {
  return TIERS.some((entry) => entry.tier === value);
}
