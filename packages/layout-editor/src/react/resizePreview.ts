import {
  getRectangleCorner,
  type RectangleGeometry,
  type ResizeCorner,
} from "../core/geometry.ts";

import { rotationHandleTransform } from "./rotation.ts";

export function resizeCursor(rotation: number, corner: ResizeCorner): string {
  const angle = rotation + (corner === "nw" || corner === "se" ? 45 : 135);
  return (
    ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"][
      ((Math.round(angle / 45) % 4) + 4) % 4
    ] ?? "nwse-resize"
  );
}

/** Updates only the active rectangle and selection controls during a gesture. */
export function paintResize(
  node: SVGGElement,
  controls: SVGGElement | null,
  geometry: RectangleGeometry,
) {
  const scale = Number(controls?.getAttribute("data-control-scale") ?? 1);
  const suffix = scale === 1 ? "" : ` scale(${scale})`;
  const transform = `rotate(${geometry.rotation} ${geometry.x + geometry.width / 2} ${geometry.y + geometry.height / 2})`;
  node.setAttribute("transform", transform);
  const rect = node.querySelector("rect");
  for (const key of ["x", "y", "width", "height"] as const)
    rect?.setAttribute(key, String(geometry[key]));
  const text = node.querySelector("text");
  text?.setAttribute("x", String(geometry.x + geometry.width / 2));
  text?.setAttribute("y", String(geometry.y + geometry.height / 2));
  const outline = controls?.querySelector("[data-selection-outline]");
  for (const key of ["x", "y", "width", "height"] as const)
    outline?.setAttribute(key, String(geometry[key]));
  outline?.setAttribute("transform", transform);
  controls
    ?.querySelector("[data-rotation-handle]")
    ?.setAttribute("transform", rotationHandleTransform(geometry) + suffix);
  for (const corner of ["nw", "ne", "se", "sw"] as const) {
    const point = getRectangleCorner(geometry, corner);
    const handle = controls?.querySelector<SVGGElement>(
      `[data-resize-corner="${corner}"]`,
    );
    handle?.setAttribute(
      "transform",
      `translate(${point.x} ${point.y})${suffix}`,
    );
    if (handle) handle.style.cursor = resizeCursor(geometry.rotation, corner);
  }
}
