export interface RectangleStyle {
  /** Colors use six-digit hex notation (#RRGGBB) in format version 1. */
  fill: string;
  stroke: string;
  strokeWidth: number;
  textColor: string;
}

export type RectangleColor = "fill" | "stroke" | "textColor";

export interface RectangleElement {
  id: string;
  type: "rectangle";
  /** Unrotated top-left corner in document coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Clockwise degrees around the rectangle's center, normalized to [0, 360). */
  rotation: number;
  label: string;
  style: RectangleStyle;
}

// Additional element types will extend this union as they are implemented.
export type LayoutElement = RectangleElement;

export interface LayoutDocument {
  formatVersion: 1;
  /** Positive integer dimensions in logical drawing units. */
  width: number;
  height: number;
  /** Back-to-front drawing order; later elements appear above earlier ones. */
  elements: LayoutElement[];
}
