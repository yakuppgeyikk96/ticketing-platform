import { snapPosition } from "./grid.ts";

export interface Point {
  x: number;
  y: number;
}
export function rectangleBounds(start: Point, end: Point, snap = false) {
  if (snap) {
    start = snapPosition(start);
    end = snapPosition(end);
  }
  const width = Math.abs(end.x - start.x),
    height = Math.abs(end.y - start.y);
  if (
    ![start.x, start.y, end.x, end.y, width, height].every(Number.isFinite) ||
    width < 2 ||
    height < 2
  )
    return null;
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width,
    height,
  };
}
