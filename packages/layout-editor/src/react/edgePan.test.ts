import { expect, test } from "vitest";
import { edgePanVelocity } from "./edgePan.ts";
import { clientToDocument } from "./coordinates.ts";

const bounds = { left: 100, top: 200, width: 800, height: 600 };

test("the middle of the viewport does not scroll", () => {
  expect(edgePanVelocity({ x: 500, y: 500 }, bounds)).toEqual({ x: 0, y: 0 });
});

test("speed ramps toward all four edges", () => {
  expect(edgePanVelocity({ x: 120, y: 500 }, bounds)).toEqual({
    x: -240,
    y: 0,
  });
  expect(edgePanVelocity({ x: 880, y: 500 }, bounds)).toEqual({ x: 240, y: 0 });
  expect(edgePanVelocity({ x: 500, y: 220 }, bounds)).toEqual({
    x: 0,
    y: -240,
  });
  expect(edgePanVelocity({ x: 500, y: 780 }, bounds)).toEqual({ x: 0, y: 240 });
});

test("outside the frame and at corners velocity stays capped", () => {
  expect(edgePanVelocity({ x: -1000, y: 2000 }, bounds)).toEqual({
    x: -480,
    y: 480,
  });
  expect(edgePanVelocity({ x: 900, y: 800 }, bounds)).toEqual({
    x: 480,
    y: 480,
  });
});

test("small and unavailable viewports avoid overlapping edge bands or invalid speeds", () => {
  expect(
    edgePanVelocity(
      { x: 10, y: 10 },
      { left: 0, top: 0, width: 20, height: 20 },
    ),
  ).toEqual({ x: 0, y: 0 });
  expect(
    edgePanVelocity({ x: 0, y: 0 }, { left: 0, top: 0, width: 0, height: 0 }),
  ).toEqual({ x: 0, y: 0 });
});

test("a stationary pointer advances in document coordinates as the viewport scrolls", () => {
  const source = (offset: number) => ({
    getScreenCTM: () => ({
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: offset, f: 0 }),
    }),
  });
  expect(clientToDocument(source(0), 800, 200)).toEqual({ x: 800, y: 200 });
  expect(clientToDocument(source(48), 800, 200)).toEqual({ x: 848, y: 200 });
});
