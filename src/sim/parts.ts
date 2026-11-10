import type { SlotId } from "./tiers";

export interface PartEffect {
  readonly health?: number;
  readonly attack?: number;
  readonly speed?: number;
  readonly crit?: number;
  readonly hallucination?: number;
}

export interface PartDefinition {
  readonly name: string;
  readonly slot: SlotId;
  readonly effect: PartEffect;
  readonly evolved?: true;
}

export const PARTS = {
  tinyBrain: { name: "Tiny model", slot: "brain", effect: { health: -10, speed: 6, hallucination: 10 } },
  midBrain: { name: "Mid model", slot: "brain", effect: { attack: 2 } },
  frontierBrain: { name: "Frontier model", slot: "brain", effect: { attack: 4, speed: -6, hallucination: -10 } },
  coldTemperature: { name: "Temperature 0", slot: "temperature", effect: { crit: -5, hallucination: -5 } },
  hotTemperature: { name: "Temperature 1.2", slot: "temperature", effect: { crit: 15, hallucination: 10 } },
  longContext: { name: "Long context window", slot: "contextWindow", effect: { health: 30 } },
  strictPrompt: { name: "Strict system prompt", slot: "systemPrompt", effect: { hallucination: -8 } },
  hypePrompt: { name: "Hype-man system prompt", slot: "systemPrompt", effect: { attack: 2, crit: 5 } },
  conversationBuffer: { name: "Conversation buffer", slot: "shortTermMemory", effect: { crit: 10 } },
  fewShotExamples: { name: "Few-shot examples", slot: "fewShot", effect: { attack: 1, hallucination: -6 } },
  webSearch: { name: "Web search", slot: "tool", effect: { attack: 3, hallucination: -4 } },
  codeExec: { name: "Code exec", slot: "tool", effect: { attack: 5 } },
  calculator: { name: "Calculator", slot: "tool", effect: { attack: 2, crit: 5 } },
  fileReader: { name: "File reader", slot: "tool", effect: { attack: 2, health: 10 } },
  toolRouter: { name: "Tool router", slot: "toolRouter", effect: {} },
  devToolsConnector: { name: "Dev tools MCP", slot: "mcpConnector", effect: { attack: 4 } },
  planner: { name: "Planner", slot: "planner", effect: { speed: -6 } },
  selfCheck: { name: "Self-check", slot: "reflection", effect: { hallucination: -10 } },
  vectorMemory: { name: "Vector memory (RAG)", slot: "longTermMemory", effect: { health: 20, hallucination: -5 } },
  refactorSkill: { name: "Refactor skill", slot: "skill", effect: { attack: 3, crit: 5 } },
  writeTheTest: { name: "Write the test", slot: "skill", effect: { crit: 5, hallucination: -4 } },
  loopRunner: { name: "Loop runner", slot: "loopRunner", effect: { speed: -4 } },
  guardrails: { name: "Guardrails", slot: "guardrails", effect: { hallucination: -15 } },
  sandbox: { name: "Sandbox", slot: "sandbox", effect: { health: 40 } },
  autoTestHook: { name: "Auto-test hook", slot: "hooks", effect: { crit: 10 } },
  compaction: { name: "Compaction", slot: "contextManager", effect: { health: 30 } },
  subagents: { name: "Subagents", slot: "subagents", effect: { attack: 6 } },
  verifier: { name: "Verifier", slot: "verifier", effect: { hallucination: -10, crit: 5 } },
  traces: { name: "Logs and traces", slot: "traces", effect: { health: 10 } },
  ragSearch: { name: "RAG", slot: "tool", effect: { attack: 7, hallucination: -12 }, evolved: true },
  ciPipeline: { name: "CI Pipeline", slot: "tool", effect: { attack: 10, crit: 10 }, evolved: true },
} as const satisfies Readonly<Record<string, PartDefinition>>;

export type PartId = keyof typeof PARTS;

export type PartsForSlot<S extends SlotId> = {
  [Id in PartId]: (typeof PARTS)[Id]["slot"] extends S ? Id : never;
}[PartId];

export interface Evolution {
  readonly ingredients: readonly [PartId, PartId];
  readonly result: PartId;
}

export const EVOLUTIONS: readonly Evolution[] = [
  { ingredients: ["webSearch", "conversationBuffer"], result: "ragSearch" },
  { ingredients: ["codeExec", "writeTheTest"], result: "ciPipeline" },
];

export function isEvolvedPart(id: PartId): boolean {
  const part: PartDefinition = PARTS[id];
  return part.evolved === true;
}
