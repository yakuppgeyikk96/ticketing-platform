import {
  getRectangleCorner,
  resizeFromCorner,
  type RectangleGeometry,
  type ResizeCorner,
  type DocumentPoint,
} from "../core/geometry.ts";

export const GRID_SIZE = 10;

/** Snap the rectangle's unrotated x/y anchor in document units. */
export function snapPosition(
  point: { x: number; y: number },
  spacing = GRID_SIZE,
) {
  if (!Number.isFinite(spacing) || spacing <= 0)
    throw new Error("Grid spacing must be positive and finite");
  const snap = (value: number) => {
    const rounded = Math.round(value / spacing) * spacing;
    return Object.is(rounded, -0) ? 0 : rounded;
  };
  return { x: snap(point.x), y: snap(point.y) };
}

/** Keep lines readable when zoomed out; snapping always keeps its base spacing. */
export function visibleGridSpacing(zoom: number) {
  return (
    GRID_SIZE *
    Math.pow(10, Math.max(0, Math.ceil(Math.log10(6 / (GRID_SIZE * zoom)))))
  );
}

/** Cardinal shapes snap the dragged world corner; other angles snap local dimensions. */
export function resizeRectangleBounds(
  original: RectangleGeometry,
  corner: ResizeCorner,
  pointer: DocumentPoint,
  snap = false,
) {
  if (!snap) return resizeFromCorner(original, corner, pointer);
  if (
    Math.abs(original.rotation / 90 - Math.round(original.rotation / 90)) <
    1e-10
  )
    return resizeFromCorner(original, corner, snapPosition(pointer));
  const bounds = resizeFromCorner(original, corner, pointer);
  const shape = {
    x: 0,
    y: 0,
    width: Math.max(
      GRID_SIZE,
      Math.round(bounds.width / GRID_SIZE) * GRID_SIZE,
    ),
    height: Math.max(
      GRID_SIZE,
      Math.round(bounds.height / GRID_SIZE) * GRID_SIZE,
    ),
    rotation: original.rotation,
  };
  const opposite: Record<ResizeCorner, ResizeCorner> = {
    nw: "se",
    ne: "sw",
    se: "nw",
    sw: "ne",
  };
  const fixed = getRectangleCorner(original, opposite[corner]);
  const from = getRectangleCorner(shape, opposite[corner]);
  const to = getRectangleCorner(shape, corner);
  return resizeFromCorner(original, corner, {
    x: fixed.x + to.x - from.x,
    y: fixed.y + to.y - from.y,
  });
}
