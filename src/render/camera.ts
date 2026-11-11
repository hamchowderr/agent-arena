import type { PerspectiveCamera } from "three";

export const PITCH = (48 * Math.PI) / 180;
export const CAMERA_DISTANCE = 380;
export const DEPTH_STRETCH = 1 / Math.sin(PITCH);

export function aimCamera(camera: PerspectiveCamera, x: number, z: number): void {
  const focusZ = z * DEPTH_STRETCH;
  camera.position.set(x, Math.sin(PITCH) * CAMERA_DISTANCE, focusZ + Math.cos(PITCH) * CAMERA_DISTANCE);
  camera.lookAt(x, 0, focusZ);
}
