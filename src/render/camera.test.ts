import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { aimCamera, DEPTH_STRETCH } from "./camera";

function onScreen(camera: PerspectiveCamera, x: number, z: number, aspect: number): { x: number; y: number } {
  const point = new Vector3(x, 0, z * DEPTH_STRETCH).project(camera);
  return { x: point.x * aspect, y: point.y };
}

describe("aimCamera", () => {
  it.each([
    ["phone held upright", 390 / 844],
    ["desktop", 16 / 9],
  ])("moves the agent the same distance on a %s screen whichever way it walks", (_, aspect) => {
    const camera = new PerspectiveCamera(30, aspect, 1, 4000);
    aimCamera(camera, 0, 0);
    camera.updateMatrixWorld();
    const centre = onScreen(camera, 0, 0, aspect);
    const right = onScreen(camera, 8, 0, aspect);
    const up = onScreen(camera, 0, -8, aspect);
    const down = onScreen(camera, 0, 8, aspect);
    const across = Math.abs(right.x - centre.x);
    expect(Math.abs(up.y - centre.y) / across).toBeCloseTo(1, 1);
    expect(Math.abs(down.y - centre.y) / across).toBeCloseTo(1, 1);
  });
});
