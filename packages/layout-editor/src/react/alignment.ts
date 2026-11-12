import {
  getRectangleCorner,
  type RectangleGeometry,
  type DocumentPoint,
} from "../core/geometry.ts";
import { snapPosition } from "./grid.ts";

export interface AlignmentBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
export interface AlignmentGuide {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Rotated shapes align using their axis-aligned geometric bounds, excluding stroke. */
export function rectangleAlignmentBounds(
  rectangle: RectangleGeometry,
): AlignmentBounds {
  const points = (["nw", "ne", "se", "sw"] as const).map((corner) =>
    getRectangleCorner(rectangle, corner),
  );
  return {
    left: Math.min(...points.map((point) => point.x)),
    right: Math.max(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
    bottom: Math.max(...points.map((point) => point.y)),
  };
}

/** Match raw pointer geometry first; fall back to grid independently on unmatched axes. */
export function alignDraggedRectangle(
  original: RectangleGeometry,
  position: DocumentPoint,
  targets: readonly AlignmentBounds[],
  tolerance: DocumentPoint,
) {
  const moving = rectangleAlignmentBounds({ ...original, ...position });
  const features = (bounds: AlignmentBounds, axis: "x" | "y") =>
    axis === "x"
      ? [bounds.left, (bounds.left + bounds.right) / 2, bounds.right]
      : [bounds.top, (bounds.top + bounds.bottom) / 2, bounds.bottom];
  function nearest(axis: "x" | "y") {
    let best: { delta: number; value: number; target: AlignmentBounds } | null =
      null;
    for (const target of targets)
      for (const value of features(target, axis))
        for (const current of features(moving, axis)) {
          const delta = value - current;
          if (
            Math.abs(delta) <= tolerance[axis] &&
            (!best || Math.abs(delta) < Math.abs(best.delta))
          )
            best = { delta, value, target };
        }
    return best;
  }
  const x = nearest("x"),
    y = nearest("y");
  const grid = snapPosition(position);
  const result = {
    x: x ? position.x + x.delta : grid.x,
    y: y ? position.y + y.delta : grid.y,
  };
  const dx = result.x - position.x,
    dy = result.y - position.y;
  const guides: AlignmentGuide[] = [];
  if (x)
    guides.push({
      x1: x.value,
      x2: x.value,
      y1: Math.min(moving.top + dy, x.target.top),
      y2: Math.max(moving.bottom + dy, x.target.bottom),
    });
  if (y)
    guides.push({
      y1: y.value,
      y2: y.value,
      x1: Math.min(moving.left + dx, y.target.left),
      x2: Math.max(moving.right + dx, y.target.right),
    });
  return { position: result, guides };
}
