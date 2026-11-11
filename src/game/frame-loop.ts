export const FRAME_FAILURES_BEFORE_RESET = 30;

export interface FrameLoopHooks {
  readonly tick: () => void;
  readonly schedule: (next: () => void) => void;
  readonly onError: (error: unknown, failures: number) => void;
}

export function startFrameLoop(hooks: FrameLoopHooks): void {
  let failures = 0;
  const run = () => {
    hooks.schedule(run);
    try {
      hooks.tick();
      failures = 0;
    } catch (error) {
      failures += 1;
      hooks.onError(error, failures);
    }
  };
  run();
}
