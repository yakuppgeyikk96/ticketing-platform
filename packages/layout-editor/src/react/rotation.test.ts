import { expect, test } from "vitest";
import { rotationDelta, rotationHandleTransform } from "./rotation.ts";
import {
  createHistory,
  commitDocument,
  rotateRectangle,
  undo,
  redo,
} from "../index.ts";
import type { LayoutDocument } from "../core/document.ts";

const center = { x: 50, y: 100 };
function point(degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: center.x + 80 * Math.cos(radians),
    y: center.y + 80 * Math.sin(radians),
  };
}

test("pointer rotation follows clockwise and counterclockwise motion around the actual center", () => {
  expect(rotationDelta(center, point(-90), point(0))).toBeCloseTo(90);
  expect(rotationDelta(center, point(0), point(-90))).toBeCloseTo(-90);
  expect(rotationDelta(center, point(30), point(30))).toBeCloseTo(0);
});

test("angle increments cross the atan2 boundary without jumping a full turn", () => {
  expect(rotationDelta(center, point(179), point(-179))).toBeCloseTo(2);
  expect(rotationDelta(center, point(-179), point(179))).toBeCloseTo(-2);
  let angle = 35;
  for (let degrees = 0; degrees < 450; degrees += 10)
    angle += rotationDelta(center, point(degrees), point(degrees + 10));
  expect(angle).toBeCloseTo(485);
});

test("undefined angles at the rotation center do not change the rotation", () => {
  expect(rotationDelta(center, point(30), center)).toBe(0);
  expect(rotationDelta(center, center, point(30))).toBe(0);
});

test("the handle stays above the rotated top edge after moving or resizing", () => {
  expect(
    rotationHandleTransform({
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      rotation: 45,
    }),
  ).toBe("rotate(45 60 50) translate(60 20)");
});

test("multiple pointer previews commit only the final angle as a single reversible edit", () => {
  const document: LayoutDocument = {
    formatVersion: 1,
    width: 1200,
    height: 800,
    elements: [
      {
        id: "stage",
        type: "rectangle",
        x: 10,
        y: 20,
        width: 100,
        height: 60,
        rotation: 350,
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
  let angle = 350;
  for (let degrees = 0; degrees < 90; degrees += 10)
    angle += rotationDelta(center, point(degrees), point(degrees + 10));
  const history = commitDocument(
    createHistory(document),
    rotateRectangle(document, "stage", angle),
  );
  expect(history.past).toHaveLength(1);
  expect(history.present.elements[0]).toEqual({
    ...document.elements[0],
    rotation: 80,
  });
  expect(undo(history).present).toEqual(document);
  expect(redo(undo(history)).present).toEqual(history.present);
});
