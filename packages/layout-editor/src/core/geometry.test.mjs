import assert from "node:assert/strict";
import { test } from "node:test";
import { getRectangleCorner, resizeFromCorner } from "../index.ts";

function near(actual, expected) {
  for (const key of Object.keys(expected))
    assert.ok(
      Math.abs(actual[key] - expected[key]) < 1e-8,
      `${key}: ${actual[key]} != ${expected[key]}`,
    );
}

test("unrotated corners correspond to document positions", () => {
  const rectangle = { x: 10, y: 20, width: 100, height: 50, rotation: 0 };
  assert.deepEqual(getRectangleCorner(rectangle, "nw"), { x: 10, y: 20 });
  assert.deepEqual(getRectangleCorner(rectangle, "ne"), { x: 110, y: 20 });
  assert.deepEqual(getRectangleCorner(rectangle, "se"), { x: 110, y: 70 });
  assert.deepEqual(getRectangleCorner(rectangle, "sw"), { x: 10, y: 70 });
});

test("all four corners resize an unrotated rectangle around the opposite anchor", () => {
  const rectangle = Object.freeze({
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    rotation: 0,
  });
  for (const [corner, pointer, expected] of [
    ["nw", { x: -10, y: 0 }, { x: -10, y: 0, width: 120, height: 70 }],
    ["ne", { x: 130, y: 0 }, { x: 10, y: 0, width: 120, height: 70 }],
    ["se", { x: 130, y: 90 }, { x: 10, y: 20, width: 120, height: 70 }],
    ["sw", { x: -10, y: 90 }, { x: -10, y: 20, width: 120, height: 70 }],
  ])
    assert.deepEqual(resizeFromCorner(rectangle, corner, pointer), expected);
});

test("90-degree resizing changes x/y while preserving the opposite world corner", () => {
  const rectangle = { x: 100, y: 100, width: 100, height: 50, rotation: 90 };
  near(getRectangleCorner(rectangle, "nw"), { x: 175, y: 75 });
  near(resizeFromCorner(rectangle, "se", { x: 100, y: 225 }), {
    x: 62.5,
    y: 112.5,
    width: 150,
    height: 75,
  });
});

test("rotated corners track the pointer without moving the anchor or changing rotation", () => {
  const opposite = { nw: "se", ne: "sw", se: "nw", sw: "ne" };
  for (const rotation of [15, 45, 135, 270, 359.5]) {
    for (const corner of Object.keys(opposite)) {
      const rectangle = Object.freeze({
        x: -125.5,
        y: 300,
        width: 100,
        height: 60,
        rotation,
      });
      const anchor = getRectangleCorner(rectangle, opposite[corner]);
      const current = getRectangleCorner(rectangle, corner);
      const pointer = {
        x: anchor.x + (current.x - anchor.x) * 1.5,
        y: anchor.y + (current.y - anchor.y) * 1.5,
      };
      const next = {
        ...rectangle,
        ...resizeFromCorner(rectangle, corner, pointer),
      };
      near(getRectangleCorner(next, opposite[corner]), anchor);
      near(getRectangleCorner(next, corner), pointer);
      near(next, { width: 150, height: 90 });
      assert.equal(next.rotation, rotation);
    }
  }
});

test("crossing the anchor clamps instead of creating negative sizes", () => {
  const rectangle = { x: 0, y: 0, width: 100, height: 80, rotation: 0 };
  assert.deepEqual(resizeFromCorner(rectangle, "nw", { x: 200, y: 200 }), {
    x: 98,
    y: 78,
    width: 2,
    height: 2,
  });
  assert.deepEqual(resizeFromCorner(rectangle, "se", { x: -100, y: -100 }, 5), {
    x: 0,
    y: 0,
    width: 5,
    height: 5,
  });
});

test("resizing to the original rotated corner preserves the original geometry", () => {
  const rectangle = {
    x: 10.5,
    y: -200,
    width: 120,
    height: 75.25,
    rotation: 33,
  };
  near(resizeFromCorner(rectangle, "sw", getRectangleCorner(rectangle, "sw")), {
    x: rectangle.x,
    y: rectangle.y,
    width: rectangle.width,
    height: rectangle.height,
  });
});

test("invalid or overflowing geometry is rejected", () => {
  const rectangle = { x: 0, y: 0, width: 100, height: 80, rotation: 0 };
  assert.throws(() => resizeFromCorner(rectangle, "se", { x: NaN, y: 10 }));
  assert.throws(() => resizeFromCorner(rectangle, "se", { x: 10, y: 10 }, 0));
  assert.throws(() =>
    resizeFromCorner({ ...rectangle, width: -1 }, "se", { x: 10, y: 10 }),
  );
  assert.throws(() => getRectangleCorner(rectangle, "missing"));
  assert.throws(() =>
    resizeFromCorner({ ...rectangle, x: -Number.MAX_VALUE }, "se", {
      x: Number.MAX_VALUE,
      y: 10,
    }),
  );
});
