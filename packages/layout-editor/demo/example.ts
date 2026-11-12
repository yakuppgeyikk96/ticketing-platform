import type { LayoutDocument, RectangleElement } from "../src/index.ts";

function rectangle(
  id: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  rotation = 0,
): RectangleElement {
  return {
    id,
    type: "rectangle",
    label,
    x,
    y,
    width,
    height,
    rotation,
    style: { fill, stroke: "#334155", strokeWidth: 2, textColor: "#ffffff" },
  };
}

export const exampleDocument: LayoutDocument = {
  formatVersion: 1,
  width: 1200,
  height: 800,
  elements: [
    rectangle("stage", "Sahne", 300, 60, 600, 120, "#334155"),
    rectangle("curtain", "Perde", 300, 190, 600, 30, "#9f1239"),
    rectangle("left", "Sol alan", 160, 290, 360, 280, "#2563eb"),
    rectangle("right", "Sağ alan", 680, 290, 360, 280, "#2563eb"),
    rectangle("back", "Arka alan", 300, 640, 600, 100, "#0f766e"),
    rectangle("entrance", "Giriş", 40, 650, 160, 60, "#b45309", 15),
  ],
};
