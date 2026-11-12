import { expect, test } from "vitest";
import { rectangleBounds } from "./drawRectangle.ts";

test("drawing supports all four drag directions with positive dimensions", () => {
  for (const [start, end] of [
    [
      { x: 10, y: 20 },
      { x: 110, y: 70 },
    ],
    [
      { x: 110, y: 70 },
      { x: 10, y: 20 },
    ],
    [
      { x: 10, y: 70 },
      { x: 110, y: 20 },
    ],
    [
      { x: 110, y: 20 },
      { x: 10, y: 70 },
    ],
  ] as const) {
    expect(rectangleBounds(start, end)).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    });
  }
});

test("clicks, degenerate and nonfinite draws do not create rectangles", () => {
  const start = { x: 0, y: 0 };
  for (const end of [
    start,
    { x: 100, y: 0 },
    { x: 1.9, y: 100 },
    { x: NaN, y: 10 },
    { x: Infinity, y: 10 },
  ])
    expect(rectangleBounds(start, end)).toBeNull();
});

test("panned negative coordinates and fractional dimensions are preserved", () => {
  expect(
    rectangleBounds({ x: -200.5, y: 1000 }, { x: -100, y: 1050.25 }),
  ).toEqual({ x: -200.5, y: 1000, width: 100.5, height: 50.25 });
});

test("Alt drawing snaps both original endpoints and returns to free geometry on release", () => {
  const start = Object.freeze({ x: 13, y: -23 });
  const end = Object.freeze({ x: 76, y: 44 });
  const free = rectangleBounds(start, end);
  expect(free).toEqual({ x: 13, y: -23, width: 63, height: 67 });
  expect(rectangleBounds(start, end, true)).toEqual({
    x: 10,
    y: -20,
    width: 70,
    height: 60,
  });
  expect(rectangleBounds(end, start, true)).toEqual({
    x: 10,
    y: -20,
    width: 70,
    height: 60,
  });
  expect(rectangleBounds(start, end, false)).toEqual(free);
});

test("snapped clicks and malformed drawing points remain invalid", () => {
  expect(rectangleBounds({ x: 13, y: 23 }, { x: 13, y: 23 }, true)).toBeNull();
  expect(rectangleBounds({ x: 13, y: 23 }, { x: 14, y: 24 }, true)).toBeNull();
  expect(
    rectangleBounds({ x: NaN, y: 23 }, { x: 100, y: 100 }, true),
  ).toBeNull();
});
