import type { RectangleElement } from "./document.ts";

export type ResizeCorner = "nw" | "ne" | "se" | "sw";
export type RectangleGeometry = Pick<
  RectangleElement,
  "x" | "y" | "width" | "height" | "rotation"
>;
export interface DocumentPoint {
  x: number;
  y: number;
}
export type RectangleBounds = Pick<
  RectangleElement,
  "x" | "y" | "width" | "height"
>;

const directions: Record<ResizeCorner, { x: number; y: number }> = {
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  se: { x: 1, y: 1 },
  sw: { x: -1, y: 1 },
};

function direction(corner: ResizeCorner) {
  const result = directions[corner];
  if (!result) throw new Error(`Unknown resize corner: ${corner}`);
  return result;
}

function validateRectangle(rectangle: RectangleGeometry) {
  if (
    ![
      rectangle.x,
      rectangle.y,
      rectangle.width,
      rectangle.height,
      rectangle.rotation,
    ].every(Number.isFinite) ||
    rectangle.width <= 0 ||
    rectangle.height <= 0
  ) {
    throw new Error(
      "Rectangle geometry must be finite with positive dimensions",
    );
  }
}

/** World/document position of a corner after rotation around the rectangle center. */
export function getRectangleCorner(
  rectangle: RectangleGeometry,
  corner: ResizeCorner,
): DocumentPoint {
  validateRectangle(rectangle);
  const sign = direction(corner);
  const angle = (rectangle.rotation * Math.PI) / 180;
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const localX = (sign.x * rectangle.width) / 2,
    localY = (sign.y * rectangle.height) / 2;
  const point = {
    x: rectangle.x + rectangle.width / 2 + cos * localX - sin * localY,
    y: rectangle.y + rectangle.height / 2 + sin * localX + cos * localY,
  };
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
    throw new Error("Corner coordinates overflowed");
  return point;
}

/** Keeps the opposite world corner fixed. Crossing it clamps dimensions, never flips. */
export function resizeFromCorner(
  rectangle: RectangleGeometry,
  corner: ResizeCorner,
  pointer: DocumentPoint,
  minimumSize = 2,
): RectangleBounds {
  validateRectangle(rectangle);
  if (
    ![pointer.x, pointer.y, minimumSize].every(Number.isFinite) ||
    minimumSize <= 0
  ) {
    throw new Error(
      "Resize pointer must be finite and minimum size must be positive",
    );
  }
  const sign = direction(corner);
  const opposite: Record<ResizeCorner, ResizeCorner> = {
    nw: "se",
    ne: "sw",
    se: "nw",
    sw: "ne",
  };
  const anchor = getRectangleCorner(rectangle, opposite[corner]);
  const angle = (rectangle.rotation * Math.PI) / 180;
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const dx = pointer.x - anchor.x,
    dy = pointer.y - anchor.y;
  // Undo rotation to measure width/height along the rectangle's own axes.
  const width = Math.max(minimumSize, sign.x * (cos * dx + sin * dy));
  const height = Math.max(minimumSize, sign.y * (-sin * dx + cos * dy));
  const localX = (sign.x * width) / 2,
    localY = (sign.y * height) / 2;
  const bounds = {
    x: anchor.x + cos * localX - sin * localY - width / 2,
    y: anchor.y + sin * localX + cos * localY - height / 2,
    width,
    height,
  };
  if (!Object.values(bounds).every(Number.isFinite))
    throw new Error("Resized geometry overflowed");
  return bounds;
}
