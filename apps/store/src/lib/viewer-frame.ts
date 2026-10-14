/**
 * Where the 3D viewer's camera stands (v0.89.0): far enough back to see the
 * whole model, with its clipping planes measured from the model itself.
 *
 * The old camera stepped back 1.2 × the model's diagonal but kept a fixed far
 * plane of 100 units, so every scene wider than ~80 units — the portfolio and
 * symposium spaces, Nerdearla — fell beyond it whole: the viewer said «ready»
 * over an empty box. Pure numbers, no three.js: the viewer measures the model
 * and hands its bounding sphere in.
 */

export interface CameraFrame {
  /** Camera position on the y axis, the model's centre at the origin. */
  readonly y: number;
  /** Camera position on the z axis, the model's centre at the origin. */
  readonly z: number;
  /** Near clipping plane: in front of the closest point the model can turn to. */
  readonly near: number;
  /** Far clipping plane: behind the farthest point the model can turn to. */
  readonly far: number;
}

/** A radius the camera can stand back from: positive and finite, else one unit. */
function usableRadius(radius: number): number {
  return Number.isFinite(radius) && radius > 0 ? radius : 1;
}

/**
 * The frame for a model inside a bounding sphere of `radius`, seen by a
 * perspective camera with a vertical field of view of `fovDegrees` (square
 * canvas) from `elevationDegrees` above the horizon, looking at the centre.
 * The whole sphere fits the view (distance = r / sin(fov / 2)), so a model
 * turning on itself never leaves it, and the clipping planes bracket the
 * sphere at any size: a chair and a 450-unit scene frame alike.
 */
export function frameSphere(
  radius: number,
  fovDegrees: number,
  elevationDegrees = 12,
): CameraFrame {
  const r = usableRadius(radius);
  const distance = r / Math.sin((fovDegrees * Math.PI) / 360);
  const elevation = (elevationDegrees * Math.PI) / 180;
  return {
    y: distance * Math.sin(elevation),
    z: distance * Math.cos(elevation),
    near: (distance - r) / 2,
    far: (distance + r) * 2,
  };
}

/**
 * Clipping planes for a camera that stands `distance` from a model of
 * `radius` (the avatar framing keeps its own position): the same bracket.
 */
export function clipPlanes(
  radius: number,
  distance: number,
): { readonly near: number; readonly far: number } {
  const r = usableRadius(radius);
  return { near: Math.max(r / 1000, (distance - r) / 2), far: (distance + r) * 2 };
}

/**
 * How much of the file has arrived, as a whole percentage below 100 (the
 * last step is drawing, not loading): the response's own length when it
 * states one, the catalogue's size otherwise, null when neither is known.
 */
export function loadedShare(loaded: number, total: number, expected: number | null): number | null {
  const whole = total > 0 ? total : (expected ?? 0);
  if (whole <= 0 || !(loaded >= 0)) return null;
  return Math.min(99, Math.floor((loaded / whole) * 100));
}
