import type { DocumentPoint, RectangleGeometry } from "../core/geometry.ts";

/** Incremental shortest angular change; crossing the center leaves the angle unchanged. */
export function rotationDelta(
  center: DocumentPoint,
  previous: DocumentPoint,
  next: DocumentPoint,
): number {
  if (
    Math.hypot(previous.x - center.x, previous.y - center.y) < 1e-6 ||
    Math.hypot(next.x - center.x, next.y - center.y) < 1e-6
  )
    return 0;
  const angle =
    ((Math.atan2(next.y - center.y, next.x - center.x) -
      Math.atan2(previous.y - center.y, previous.x - center.x)) *
      180) /
    Math.PI;
  return ((angle + 540) % 360) - 180;
}

export function rotationHandleTransform(geometry: RectangleGeometry): string {
  return `rotate(${geometry.rotation} ${geometry.x + geometry.width / 2} ${geometry.y + geometry.height / 2}) translate(${geometry.x + geometry.width / 2} ${geometry.y})`;
}
