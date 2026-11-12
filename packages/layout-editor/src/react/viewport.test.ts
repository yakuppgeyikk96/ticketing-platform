import { expect, test } from "vitest";
import {
  zoomAt,
  fitViewport,
  wheelZoomFactor,
  documentViewportBounds,
} from "./viewport.ts";
import { clientToDocument } from "./coordinates.ts";
import { resizeFromCorner } from "../core/geometry.ts";
import type { LayoutDocument } from "../core/document.ts";

test("zoom keeps the document point under the pointer fixed, including after panning", () => {
  const view = { x: -320, y: 140, zoom: 0.5 };
  const anchor = { x: 210, y: 80 };
  for (const zoom of [0.01, 0.25, 1, 3, 8]) {
    const next = zoomAt(view, anchor, zoom);
    expect(next.x + anchor.x / next.zoom).toBeCloseTo(
      view.x + anchor.x / view.zoom,
    );
    expect(next.y + anchor.y / next.zoom).toBeCloseTo(
      view.y + anchor.y / view.zoom,
    );
  }
  expect(view).toEqual({ x: -320, y: 140, zoom: 0.5 });
});

test("zoom limits prevent a collapsed view and preserve the anchor at the limit", () => {
  expect(zoomAt({ x: 0, y: 0, zoom: 1 }, { x: 100, y: 50 }, 100).zoom).toBe(8);
  expect(zoomAt({ x: 0, y: 0, zoom: 1 }, { x: 100, y: 50 }, 0).zoom).toBe(0.01);
  expect(
    zoomAt({ x: 0, y: 0, zoom: 0.001 }, { x: 100, y: 50 }, 0.0012).zoom,
  ).toBeCloseTo(0.0012);
});

test("fit centers the entire plan with padding in wide, tall and tiny containers", () => {
  for (const size of [
    { width: 900, height: 500 },
    { width: 300, height: 900 },
    { width: 1, height: 1 },
  ]) {
    const plan = { x: -200, y: -50, width: 1400, height: 850 };
    const view = fitViewport(size, plan);
    expect(view.zoom).toBeGreaterThan(0);
    expect((plan.x - view.x) * view.zoom).toBeGreaterThanOrEqual(0);
    expect((plan.y - view.y) * view.zoom).toBeGreaterThanOrEqual(0);
    expect((plan.x + plan.width - view.x) * view.zoom).toBeLessThanOrEqual(
      size.width,
    );
    expect((plan.y + plan.height - view.y) * view.zoom).toBeLessThanOrEqual(
      size.height,
    );
    expect(view.x + size.width / view.zoom / 2).toBeCloseTo(
      plan.x + plan.width / 2,
    );
    expect(view.y + size.height / view.zoom / 2).toBeCloseTo(
      plan.y + plan.height / 2,
    );
  }
});

test("fit includes rotated artwork outside the document and handles empty plans", () => {
  const document: LayoutDocument = {
    formatVersion: 1,
    width: 1200,
    height: 800,
    elements: [],
  };
  expect(documentViewportBounds(document)).toEqual({
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
  });
  document.elements.push({
    id: "outside",
    type: "rectangle",
    x: -200,
    y: 0,
    width: 100,
    height: 200,
    rotation: 90,
    label: "",
    style: {
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 2,
      textColor: "#000000",
    },
  });
  const bounds = documentViewportBounds(document);
  expect(bounds.x).toBeCloseTo(-251);
  expect(bounds.width).toBeCloseTo(1451);
});

test("wheel units normalize pixels, lines and pages, with bounded large deltas", () => {
  expect(wheelZoomFactor(16, 0, 600)).toBeCloseTo(wheelZoomFactor(1, 1, 600));
  expect(wheelZoomFactor(100, 0, 100)).toBeCloseTo(wheelZoomFactor(1, 2, 100));
  expect(wheelZoomFactor(-100, 0, 600)).toBeGreaterThan(1);
  expect(wheelZoomFactor(100, 0, 600)).toBeLessThan(1);
  expect(wheelZoomFactor(100000, 0, 600)).toBe(wheelZoomFactor(240, 0, 600));
});

test("pointer edits use document coordinates after zoom and host CSS scaling", () => {
  const svg = {
    getScreenCTM: () => ({
      inverse: () => ({ a: 0.25, b: 0, c: 0, d: 0.25, e: -50, f: 100 }),
    }),
  };
  const pointer = clientToDocument(svg, 600, 400)!;
  expect(pointer).toEqual({ x: 100, y: 200 });
  const original = { x: 0, y: 0, width: 50, height: 50, rotation: 0 };
  expect(resizeFromCorner(original, "se", pointer)).toEqual({
    x: 0,
    y: 0,
    width: 100,
    height: 200,
  });
});
