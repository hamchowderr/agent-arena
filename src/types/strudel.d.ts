declare module "@strudel/web" {
  export function initStrudel(options?: Record<string, unknown>): Promise<unknown>;
  export function evaluate(code: string): Promise<unknown>;
  export function hush(): void;
}

declare module "@strudel/core" {
  export interface Hap {
    readonly value: unknown;
  }
  export interface Pattern {
    queryArc(begin: number, end: number): Hap[];
  }
  export function evalScope(...modules: unknown[]): Promise<unknown>;
  export function evaluate(code: string, transpiler?: unknown): Promise<{ pattern: Pattern }>;
}

declare module "@strudel/mini";

declare module "@strudel/transpiler" {
  export const transpiler: unknown;
}
