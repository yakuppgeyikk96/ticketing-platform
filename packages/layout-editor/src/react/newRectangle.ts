import type { RectangleElement } from "../core/document.ts";

/** The caller supplies identity and the current viewport center in document units. */
export function createDefaultRectangle(
  id: string,
  center: { x: number; y: number },
  label: string,
): RectangleElement {
  const width = 160,
    height = 100;
  return {
    id,
    type: "rectangle",
    label,
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    rotation: 0,
    style: {
      fill: "#2563eb",
      stroke: "#334155",
      strokeWidth: 2,
      textColor: "#ffffff",
    },
  };
}
