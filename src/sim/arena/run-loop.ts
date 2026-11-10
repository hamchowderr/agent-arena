export const RUN_PHASES = ["title", "playing", "levelUp", "pausedPlaying", "pausedLevelUp", "dead", "won"] as const;
export type RunPhase = (typeof RUN_PHASES)[number];

export const RUN_EVENTS = ["start", "levelUpOpened", "cardTaken", "pause", "resume", "died", "finalBossDown", "toTitle"] as const;
export type RunEvent = (typeof RUN_EVENTS)[number];

export const SIM_PHASES = ["playing", "levelUp", "dead", "won"] as const satisfies readonly RunPhase[];
export type SimPhase = (typeof SIM_PHASES)[number];

export const TERMINAL_PHASES = ["dead", "won"] as const satisfies readonly SimPhase[];

export const RUN_LOOP: Readonly<Record<RunPhase, Readonly<Partial<Record<RunEvent, RunPhase>>>>> = {
  title: { start: "playing" },
  playing: { levelUpOpened: "levelUp", pause: "pausedPlaying", died: "dead", finalBossDown: "won" },
  levelUp: { cardTaken: "playing", pause: "pausedLevelUp" },
  pausedPlaying: { resume: "playing" },
  pausedLevelUp: { resume: "levelUp" },
  dead: { start: "playing", toTitle: "title" },
  won: { start: "playing", toTitle: "title" },
};

export function nextPhase(phase: RunPhase, event: RunEvent): RunPhase | null {
  return RUN_LOOP[phase][event] ?? null;
}

export function isSimPhase(phase: RunPhase): phase is SimPhase {
  return (SIM_PHASES as readonly RunPhase[]).includes(phase);
}

export function isTerminal(phase: RunPhase): boolean {
  return (TERMINAL_PHASES as readonly RunPhase[]).includes(phase);
}

export function runLoopMermaid(): string {
  const lines = ["stateDiagram-v2", "  [*] --> title"];
  for (const phase of RUN_PHASES) {
    for (const event of RUN_EVENTS) {
      const target = RUN_LOOP[phase][event];
      if (target) {
        lines.push(`  ${phase} --> ${target}: ${event}`);
      }
    }
  }
  return lines.join("\n");
}
