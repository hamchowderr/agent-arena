import { describe, expect, it } from "vitest";
import { PAD, quantize, readPad, STICK_RADIUS, stickDirection, stickKnob, STILL } from "./controls";

const pad = (axes: number[], down: number[] = []) => ({ axes, buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: down.includes(index) })) });

describe("touch and gamepad controls", () => {
  it("turns an analog push into one of eight directions", () => {
    expect(quantize(1, 0)).toEqual({ moveX: 1, moveY: 0 });
    expect(quantize(0.7, 0.7)).toEqual({ moveX: 1, moveY: 1 });
    expect(quantize(-0.1, -1)).toEqual({ moveX: 0, moveY: -1 });
    expect(quantize(-0.7, 0.7)).toEqual({ moveX: -1, moveY: 1 });
  });

  it("ignores small pushes inside the dead zone", () => {
    expect(quantize(0.1, 0.1)).toEqual(STILL);
  });

  it("reads a floating touch stick from where the finger first landed", () => {
    const stick = { id: 1, originX: 200, originY: 600, x: 200, y: 600 - STICK_RADIUS };
    expect(stickDirection(stick)).toEqual({ moveX: 0, moveY: -1 });
    stick.x = 200 + STICK_RADIUS * 3;
    stick.y = 600;
    expect(stickKnob(stick)).toEqual({ x: 200 + STICK_RADIUS, y: 600 });
  });

  it("prefers the d-pad over the stick and reports each button once per press", () => {
    const first = readPad(pad([1, 0], [PAD.up, PAD.confirm]), []);
    expect(first.direction).toEqual({ moveX: 0, moveY: -1 });
    expect(first.pressed).toEqual([PAD.confirm, PAD.up]);
    const second = readPad(pad([1, 0], [PAD.confirm]), first.held);
    expect(second.direction).toEqual({ moveX: 1, moveY: 0 });
    expect(second.pressed).toEqual([]);
  });
});
