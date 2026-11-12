import {
  getRectangleCorner,
  resizeFromCorner,
  type ResizeCorner,
} from "../core/geometry.ts";
import { expect, test } from "vitest";
import {
  snapPosition,
  visibleGridSpacing,
  resizeRectangleBounds,
} from "./grid.ts";
import {
  moveRectangle,
  createHistory,
  commitDocument,
  undo,
  redo,
} from "../index.ts";
import type { LayoutDocument } from "../core/document.ts";

test("snapping rounds absolute document coordinates, including negative coordinates", () => {
  expect(snapPosition({ x: 14, y: 26 })).toEqual({ x: 10, y: 30 });
  expect(snapPosition({ x: -16, y: -24 })).toEqual({ x: -20, y: -20 });
  expect(snapPosition({ x: -1, y: 0 })).toEqual({ x: 0, y: 0 });
  expect(snapPosition({ x: 20, y: 30 })).toEqual({ x: 20, y: 30 });
  expect(snapPosition({ x: 14, y: 26 }, 5)).toEqual({ x: 15, y: 25 });
});

test("snapping changes neither caller data nor the grid with zoom", () => {
  const point = Object.freeze({ x: 23, y: 67 });
  for (const zoom of [0.01, 0.1, 0.5, 1, 8]) {
    expect(visibleGridSpacing(zoom) * zoom).toBeGreaterThanOrEqual(6);
    expect(visibleGridSpacing(zoom) % 10).toBe(0);
    expect(snapPosition(point)).toEqual({ x: 20, y: 70 });
  }
  expect(point).toEqual({ x: 23, y: 67 });
});

test("invalid grid spacing is rejected", () => {
  for (const spacing of [0, -10, NaN, Infinity])
    expect(() => snapPosition({ x: 1, y: 1 }, spacing)).toThrow();
});

test("snapped movement preserves rotated geometry and commits a single reversible edit", () => {
  const document: LayoutDocument = {
    formatVersion: 1,
    width: 1200,
    height: 800,
    elements: [
      {
        id: "a",
        type: "rectangle",
        x: 13,
        y: 27,
        width: 100,
        height: 60,
        rotation: 37,
        label: "Stage",
        style: {
          fill: "#ffffff",
          stroke: "#000000",
          strokeWidth: 1,
          textColor: "#000000",
        },
      },
    ],
  };
  const next = moveRectangle(document, "a", snapPosition({ x: 46, y: -14 }));
  expect(next.elements[0]).toEqual({ ...document.elements[0], x: 50, y: -10 });
  const history = commitDocument(createHistory(document), next);
  expect(history.past).toHaveLength(1);
  expect(undo(history).present).toEqual(document);
  expect(redo(undo(history)).present).toEqual(next);
});

test("Alt resize snaps cardinal world corners while keeping the opposite corner anchored", () => {
  const opposite: Record<ResizeCorner, ResizeCorner> = {
    nw: "se",
    ne: "sw",
    se: "nw",
    sw: "ne",
  };
  for (const rotation of [0, 90, 180, 270])
    for (const corner of ["nw", "ne", "se", "sw"] as const) {
      const original = { x: 13, y: 27, width: 100, height: 60, rotation };
      const current = getRectangleCorner(original, corner);
      const center = { x: 63, y: 57 };
      const pointer = {
        x: current.x + Math.sign(current.x - center.x) * 24,
        y: current.y + Math.sign(current.y - center.y) * 18,
      };
      const next = {
        ...original,
        ...resizeRectangleBounds(original, corner, pointer, true),
      };
      const moved = getRectangleCorner(next, corner);
      const snapped = snapPosition(pointer);
      expect(moved.x).toBeCloseTo(snapped.x);
      expect(moved.y).toBeCloseTo(snapped.y);
      const fixed = getRectangleCorner(original, opposite[corner]);
      const after = getRectangleCorner(next, opposite[corner]);
      expect(after.x).toBeCloseTo(fixed.x);
      expect(after.y).toBeCloseTo(fixed.y);
    }
});

test("Alt resize of rotated shapes snaps local sizes and preserves angle and fixed corner", () => {
  for (const rotation of [15, 37, 135, 315]) {
    const original = { x: 13, y: 27, width: 103, height: 67, rotation };
    const pointer = { x: 250, y: 180 };
    const next = {
      ...original,
      ...resizeRectangleBounds(original, "se", pointer, true),
    };
    expect(next.width / 10).toBeCloseTo(Math.round(next.width / 10));
    expect(next.height / 10).toBeCloseTo(Math.round(next.height / 10));
    expect(next.width).toBeGreaterThanOrEqual(10);
    expect(next.height).toBeGreaterThanOrEqual(10);
    const fixed = getRectangleCorner(original, "nw");
    const after = getRectangleCorner(next, "nw");
    expect(after.x).toBeCloseTo(fixed.x);
    expect(after.y).toBeCloseTo(fixed.y);
    expect(resizeRectangleBounds(original, "se", pointer, false)).toEqual(
      resizeFromCorner(original, "se", pointer),
    );
  }
});

test("Alt resizing across the opposite corner still clamps to a positive size", () => {
  for (const rotation of [0, 37, 90]) {
    const original = { x: 13, y: 27, width: 100, height: 60, rotation };
    const opposite = getRectangleCorner(original, "nw");
    const next = resizeRectangleBounds(original, "se", opposite, true);
    expect(next.width).toBeGreaterThanOrEqual(2);
    expect(next.height).toBeGreaterThanOrEqual(2);
  }
});
