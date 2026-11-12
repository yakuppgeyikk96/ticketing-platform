import { expect, test } from "vitest";
import { clientToDocument } from "./coordinates.ts";

test("pointer conversion accounts for scaling and aspect-ratio offsets", () => {
  const svg = {
    getScreenCTM: () => ({
      inverse: () => ({ a: 2, b: 0, c: 0, d: 2, e: -100, f: -200 }),
    }),
  };
  expect(clientToDocument(svg, 150, 200)).toEqual({ x: 200, y: 200 });
  expect(clientToDocument(svg, 50, 100)).toEqual({ x: 0, y: 0 });
});

test("pointer conversion rejects unavailable and singular transforms", () => {
  expect(clientToDocument({ getScreenCTM: () => null }, 0, 0)).toBeNull();
  const svg = {
    getScreenCTM: () => ({
      inverse: () => ({ a: NaN, b: NaN, c: NaN, d: NaN, e: NaN, f: NaN }),
    }),
  };
  expect(clientToDocument(svg, 10, 10)).toBeNull();
});
