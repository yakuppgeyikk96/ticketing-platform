import { expect, test } from "vitest";
import { layerDropIndex } from "./layerDrop.ts";
import {
  moveRectangleToIndex,
  createHistory,
  commitDocument,
  undo,
} from "../index.ts";
import type { LayoutDocument } from "../core/document.ts";

function document(): LayoutDocument {
  return {
    formatVersion: 1,
    width: 1200,
    height: 800,
    elements: ["a", "b", "c", "d"].map((id) => ({
      id,
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      label: id,
      style: {
        fill: "#ffffff",
        stroke: "#000000",
        strokeWidth: 1,
        textColor: "#000000",
      },
    })),
  };
}

test("top-down list drops map both edges and both directions to paint order", () => {
  for (const [source, target, edge, expected] of [
    ["a", "d", "above", ["b", "c", "d", "a"]],
    ["a", "c", "below", ["b", "a", "c", "d"]],
    ["d", "a", "below", ["d", "a", "b", "c"]],
    ["d", "b", "above", ["a", "b", "d", "c"]],
  ] as const) {
    const input = document();
    const before = structuredClone(input);
    const index = layerDropIndex(input.elements, source, target, edge);
    expect(index).not.toBeNull();
    const next = moveRectangleToIndex(input, source, index!);
    expect(next.elements.map((element) => element.id)).toEqual(expected);
    expect(input).toEqual(before);
  }
});

test("dropping alongside the current position creates no history and preserves redo", () => {
  const input = document();
  const history = undo(
    commitDocument(createHistory(input), moveRectangleToIndex(input, "b", 3)),
  );
  for (const [target, edge] of [
    ["a", "above"],
    ["c", "below"],
  ] as const) {
    const index = layerDropIndex(input.elements, "b", target, edge)!;
    expect(
      commitDocument(
        history,
        moveRectangleToIndex(history.present, "b", index),
      ),
    ).toBe(history);
  }
});

test("self-drops and missing source or target rows are ignored", () => {
  const elements = document().elements;
  expect(layerDropIndex(elements, "a", "a", "above")).toBeNull();
  expect(layerDropIndex(elements, "missing", "a", "above")).toBeNull();
  expect(layerDropIndex(elements, "a", "missing", "below")).toBeNull();
  expect(layerDropIndex([], "a", "b", "above")).toBeNull();
});
