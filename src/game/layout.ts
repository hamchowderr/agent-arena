export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface Stage {
  readonly width: number;
  readonly height: number;
  readonly portrait: boolean;
}

export interface View {
  readonly width: number;
  readonly height: number;
  readonly portrait: boolean;
  readonly stage: Stage;
  readonly stageX: number;
  readonly stageY: number;
  readonly safe: Insets;
  readonly unitsPerCss: number;
}

export interface RenderSize {
  readonly width: number;
  readonly height: number;
}

export const WIDE_STAGE: Stage = { width: 1440, height: 810, portrait: false };
export const TALL_STAGE: Stage = { width: 540, height: 1080, portrait: true };
export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export const RENDER_SHORT_WIDE = 270;
export const RENDER_SHORT_TALL = 216;
export const RENDER_LONG_MAX = 640;

const MIN_CSS = 1;

export function fitView(cssWidth: number, cssHeight: number, safeCss: Insets = NO_INSETS): View {
  const width = Math.max(MIN_CSS, cssWidth);
  const height = Math.max(MIN_CSS, cssHeight);
  const portrait = height > width;
  const stage = portrait ? TALL_STAGE : WIDE_STAGE;
  const unitsPerCss = Math.max(stage.width / width, stage.height / height);
  const viewWidth = Math.round(width * unitsPerCss);
  const viewHeight = Math.round(height * unitsPerCss);
  return {
    width: viewWidth,
    height: viewHeight,
    portrait,
    stage,
    stageX: Math.round((viewWidth - stage.width) / 2),
    stageY: Math.round((viewHeight - stage.height) / 2),
    safe: {
      top: Math.round(safeCss.top * unitsPerCss),
      right: Math.round(safeCss.right * unitsPerCss),
      bottom: Math.round(safeCss.bottom * unitsPerCss),
      left: Math.round(safeCss.left * unitsPerCss),
    },
    unitsPerCss,
  };
}

export function renderSize(view: View): RenderSize {
  const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  if (view.portrait) {
    const width = RENDER_SHORT_TALL;
    return { width, height: even(Math.min(RENDER_LONG_MAX, (width * view.height) / view.width)) };
  }
  const height = RENDER_SHORT_WIDE;
  return { width: even(Math.min(RENDER_LONG_MAX, (height * view.width) / view.height)), height };
}

let current = fitView(WIDE_STAGE.width, WIDE_STAGE.height);

export function view(): View {
  return current;
}

export function setView(next: View): void {
  current = next;
}

export function toStage(x: number, y: number): { readonly x: number; readonly y: number } {
  return { x: x - current.stageX, y: y - current.stageY };
}

export function fromStage<T extends { readonly x: number; readonly y: number }>(rect: T): T {
  return { ...rect, x: rect.x + current.stageX, y: rect.y + current.stageY };
}

export function inStage(context: CanvasRenderingContext2D, draw: () => void): void {
  context.save();
  context.translate(current.stageX, current.stageY);
  draw();
  context.restore();
}

export function fillBehindStage(context: CanvasRenderingContext2D, color: string): void {
  context.fillStyle = color;
  context.fillRect(-current.stageX - 2, -current.stageY - 2, current.width + 4, current.height + 4);
}

export const HUD_MAX_PIXELS = 3_600_000;

export function hudBacking(cssWidth: number, cssHeight: number, pixelRatio: number): RenderSize {
  const width = Math.max(MIN_CSS, cssWidth);
  const height = Math.max(MIN_CSS, cssHeight);
  const wanted = Math.max(1, Math.min(3, pixelRatio));
  const ratio = Math.min(wanted, Math.sqrt(HUD_MAX_PIXELS / (width * height)));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}
