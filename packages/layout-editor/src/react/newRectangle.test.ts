import { expect, test } from "vitest";
import { createDefaultRectangle } from "./newRectangle.ts";
import {
  addRectangle,
  createHistory,
  commitDocument,
  undo,
  redo,
  validateDocument,
} from "../index.ts";

test("new rectangles are centered in document coordinates, including a panned viewport", () => {
  for (const center of [
    { x: 600, y: 400 },
    { x: -350, y: 1600 },
  ]) {
    const rectangle = createDefaultRectangle("new", center, "Yeni dikdörtgen");
    expect(rectangle.x + rectangle.width / 2).toBe(center.x);
    expect(rectangle.y + rectangle.height / 2).toBe(center.y);
    expect(rectangle.id).toBe("new");
    expect(rectangle.label).toBe("Yeni dikdörtgen");
    expect(
      validateDocument({
        formatVersion: 1,
        width: 1200,
        height: 800,
        elements: [rectangle],
      }).success,
    ).toBe(true);
  }
});

test("the default rectangle is a single undoable edit with its identity preserved on redo", () => {
  const initial = createHistory({
    formatVersion: 1,
    width: 1200,
    height: 800,
    elements: [],
  });
  const rectangle = createDefaultRectangle(
    "new",
    { x: 600, y: 400 },
    "Rectangle",
  );
  const edited = commitDocument(
    initial,
    addRectangle(initial.present, rectangle),
  );
  expect(edited.past).toHaveLength(1);
  expect(undo(edited).present.elements).toEqual([]);
  expect(redo(undo(edited)).present.elements).toEqual([rectangle]);
});
