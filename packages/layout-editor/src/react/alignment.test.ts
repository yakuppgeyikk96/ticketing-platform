import { expect, test } from "vitest";
import {
  alignDraggedRectangle,
  rectangleAlignmentBounds,
} from "./alignment.ts";
import {
  createHistory,
  commitDocument,
  moveRectangle,
  undo,
} from "../index.ts";
import type { LayoutDocument } from "../core/document.ts";

const original = { x: 0, y: 0, width: 30, height: 20, rotation: 0 };
const target = { left: 103, right: 163, top: 100, bottom: 140 };
const tolerance = { x: 6, y: 6 };

test("nearby edges and centers beat grid and produce exact alignment guides", () => {
  const next = alignDraggedRectangle(
    original,
    { x: 70, y: 111 },
    [target],
    tolerance,
  );
  expect(next.position).toEqual({ x: 73, y: 110 });
  expect(next.guides).toEqual([
    { x1: 103, x2: 103, y1: 100, y2: 140 },
    { y1: 120, y2: 120, x1: 73, x2: 163 },
  ]);
});

test("only unmatched axes fall back to the grid", () => {
  const next = alignDraggedRectangle(
    original,
    { x: 70, y: 251 },
    [target],
    tolerance,
  );
  expect(next.position).toEqual({ x: 73, y: 250 });
  expect(next.guides).toHaveLength(1);
  expect(next.guides[0]).toEqual({ x1: 103, x2: 103, y1: 100, y2: 270 });
  expect(
    alignDraggedRectangle(original, { x: -26, y: 251 }, [], tolerance),
  ).toEqual({ position: { x: -30, y: 250 }, guides: [] });
});

test("the nearest raw geometry match wins rather than a farther target or grid", () => {
  const farther = { ...target, left: 106, right: 166 };
  expect(
    alignDraggedRectangle(
      original,
      { x: 74, y: 251 },
      [farther, target],
      tolerance,
    ).position.x,
  ).toBe(73);
  expect(
    alignDraggedRectangle(
      { ...original, width: 20 },
      { x: 143, y: 251 },
      [{ ...target, left: 100, right: 200 }],
      tolerance,
    ).position.x,
  ).toBe(140);
});

test("screen-pixel tolerance maps correctly across zoom levels", () => {
  for (const zoom of [0.25, 1, 4]) {
    const near = { x: 703 + 5 / zoom, y: 251 };
    const next = alignDraggedRectangle(
      { ...original, width: 300 },
      near,
      [{ ...target, left: 1003, right: 1603 }],
      {
        x: 6 / zoom,
        y: 6 / zoom,
      },
    );
    expect(next.position.x).toBeCloseTo(703);
  }
  expect(
    alignDraggedRectangle(original, { x: 75, y: 251 }, [target], {
      x: 1.5,
      y: 1.5,
    }).guides,
  ).toHaveLength(0);
});

test("rotated shapes align their world bounds without changing rotation or size", () => {
  const rotated = { ...original, rotation: 90 };
  const rotatedBounds = rectangleAlignmentBounds(rotated);
  expect(rotatedBounds.left).toBeCloseTo(5);
  expect(rotatedBounds.right).toBeCloseTo(25);
  expect(rotatedBounds.top).toBeCloseTo(-5);
  expect(rotatedBounds.bottom).toBeCloseTo(25);
  const position = Object.freeze({ x: 75, y: 251 });
  const targets = Object.freeze([Object.freeze({ ...target })]);
  const next = alignDraggedRectangle(rotated, position, targets, tolerance);
  expect(next.position.x).toBeCloseTo(78);
  expect(position).toEqual({ x: 75, y: 251 });
  expect(rotated.rotation).toBe(90);
  const bounds = rectangleAlignmentBounds({ ...rotated, ...next.position });
  expect(bounds.right).toBeCloseTo(target.left);
});

test("a completed aligned move is one reversible document edit", () => {
  const document: LayoutDocument = {
    formatVersion: 1,
    width: 1200,
    height: 800,
    elements: [
      {
        ...original,
        id: "a",
        type: "rectangle",
        label: "A",
        style: {
          fill: "#ffffff",
          stroke: "#000000",
          strokeWidth: 1,
          textColor: "#000000",
        },
      },
    ],
  };
  const aligned = alignDraggedRectangle(
    original,
    { x: 70, y: 111 },
    [target],
    tolerance,
  );
  const next = moveRectangle(document, "a", aligned.position);
  const history = commitDocument(createHistory(document), next);
  expect(history.past).toHaveLength(1);
  expect(undo(history).present).toEqual(document);
  expect(next.elements[0]).not.toHaveProperty("guides");
});
