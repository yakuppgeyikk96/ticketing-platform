import type { LayoutDocument } from "../core/document.ts";
import { getRectangleCorner } from "../core/geometry.ts";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}
export interface ViewportSize {
  width: number;
  height: number;
}

/** Keeps the document point under a viewport-relative CSS pixel stationary. */
export function zoomAt(
  view: Viewport,
  anchor: { x: number; y: number },
  zoom: number,
): Viewport {
  const next = Math.min(8, Math.max(Math.min(0.01, view.zoom), zoom));
  return {
    x: view.x + anchor.x / view.zoom - anchor.x / next,
    y: view.y + anchor.y / view.zoom - anchor.y / next,
    zoom: next,
  };
}

/** Fits the document boundary, centered with a CSS-pixel margin. */
export function fitViewport(
  size: ViewportSize,
  document: ViewportSize & { x?: number; y?: number },
): Viewport {
  const padding = Math.min(24, size.width / 4, size.height / 4);
  const zoom = Math.min(
    8,
    (size.width - padding * 2) / document.width,
    (size.height - padding * 2) / document.height,
  );
  return {
    x: (document.x ?? 0) + (document.width - size.width / zoom) / 2,
    y: (document.y ?? 0) + (document.height - size.height / zoom) / 2,
    zoom,
  };
}

/** WheelEvent deltaMode: pixels, lines or pages. Cap large deltas for predictable zoom. */
export function wheelZoomFactor(
  delta: number,
  mode: number,
  pageHeight: number,
): number {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1);
  return Math.exp(-Math.max(-240, Math.min(240, pixels)) * 0.002);
}

/** Include artwork outside the document boundary, including rotated corners. */
export function documentViewportBounds(document: LayoutDocument) {
  let left = 0,
    top = 0,
    right = document.width,
    bottom = document.height;
  for (const element of document.elements) {
    const stroke = element.style.strokeWidth / 2;
    for (const corner of ["nw", "ne", "se", "sw"] as const) {
      const point = getRectangleCorner(element, corner);
      left = Math.min(left, point.x - stroke);
      top = Math.min(top, point.y - stroke);
      right = Math.max(right, point.x + stroke);
      bottom = Math.max(bottom, point.y + stroke);
    }
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}
