export interface Direction {
  readonly moveX: -1 | 0 | 1;
  readonly moveY: -1 | 0 | 1;
}

export const STILL: Direction = { moveX: 0, moveY: 0 };
export const STICK_RADIUS = 90;
export const DEAD_ZONE = 0.3;

const SECTORS: readonly Direction[] = [
  { moveX: 1, moveY: 0 },
  { moveX: 1, moveY: 1 },
  { moveX: 0, moveY: 1 },
  { moveX: -1, moveY: 1 },
  { moveX: -1, moveY: 0 },
  { moveX: -1, moveY: -1 },
  { moveX: 0, moveY: -1 },
  { moveX: 1, moveY: -1 },
];

export function quantize(x: number, y: number, deadZone = DEAD_ZONE): Direction {
  if (Math.hypot(x, y) < deadZone) {
    return STILL;
  }
  const sector = Math.round(Math.atan2(y, x) / (Math.PI / 4));
  return SECTORS[(sector + 8) % 8] ?? STILL;
}

export interface Stick {
  readonly id: number;
  readonly originX: number;
  readonly originY: number;
  x: number;
  y: number;
}

export function stickDirection(stick: Stick): Direction {
  return quantize((stick.x - stick.originX) / STICK_RADIUS, (stick.y - stick.originY) / STICK_RADIUS);
}

export function stickKnob(stick: Stick): { readonly x: number; readonly y: number } {
  const dx = stick.x - stick.originX;
  const dy = stick.y - stick.originY;
  const length = Math.hypot(dx, dy);
  const scale = length > STICK_RADIUS ? STICK_RADIUS / length : 1;
  return { x: stick.originX + dx * scale, y: stick.originY + dy * scale };
}

export interface PadSnapshot {
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean }[];
}

export const PAD = { confirm: 0, back: 1, reroll: 2, skip: 3, start: 9, up: 12, down: 13, left: 14, right: 15 } as const;

export interface PadFrame {
  readonly direction: Direction;
  readonly pressed: readonly number[];
  readonly held: readonly boolean[];
}

export function readPad(pad: PadSnapshot, before: readonly boolean[]): PadFrame {
  const held = pad.buttons.map((button) => button.pressed);
  const pressed = held.flatMap((down, index) => (down && !before[index] ? [index] : []));
  const dpadX = (held[PAD.right] ? 1 : 0) - (held[PAD.left] ? 1 : 0);
  const dpadY = (held[PAD.down] ? 1 : 0) - (held[PAD.up] ? 1 : 0);
  const direction = dpadX !== 0 || dpadY !== 0 ? quantize(dpadX, dpadY) : quantize(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
  return { direction, pressed, held };
}
