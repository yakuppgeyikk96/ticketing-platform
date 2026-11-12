import assert from "node:assert/strict";
import { test } from "node:test";
import { validateDocument } from "../index.ts";

function fixture() {
  return {
    formatVersion: 1,
    width: 1200,
    height: 800,
    elements: [
      {
        id: "stage",
        type: "rectangle",
        x: -10.5,
        y: 20.25,
        width: 400,
        height: 100,
        rotation: 45,
        label: "Stage",
        style: {
          fill: "#444444",
          stroke: "#222222",
          strokeWidth: 1,
          textColor: "#ffffff",
        },
      },
    ],
  };
}

test("accepts valid documents without changing content or identity", () => {
  const document = fixture();
  const original = structuredClone(document);
  const result = validateDocument(document);
  assert.equal(result.success, true);
  assert.equal(result.document, document);
  assert.deepEqual(document, original);
  assert.equal(validateDocument({ ...document, elements: [] }).success, true);
});

test("rejects malformed document roots, dimensions and versions", () => {
  for (const value of [
    null,
    [],
    "{}",
    new Date(),
    {},
    { ...fixture(), formatVersion: 2 },
    { ...fixture(), width: 0 },
    { ...fixture(), height: 1.5 },
    { ...fixture(), width: Infinity },
    { ...fixture(), elements: null },
    { ...fixture(), unexpected: true },
  ]) {
    assert.equal(validateDocument(value).success, false);
  }
});

test("rejects invalid element fields with their exact paths", () => {
  for (const [key, value] of [
    ["id", " "],
    ["type", "script"],
    ["x", NaN],
    ["y", Infinity],
    ["width", 0],
    ["height", -1],
    ["rotation", 360],
    ["rotation", -1],
    ["label", null],
    ["unexpected", true],
  ]) {
    const document = fixture();
    document.elements[0][key] = value;
    const result = validateDocument(document);
    assert.equal(result.success, false);
    assert.ok(
      result.issues.some(
        (issue) => issue.path.join(".") === `elements.0.${key}`,
      ),
    );
  }
});

test("rejects duplicate IDs, missing fields and sparse elements", () => {
  const document = fixture();
  document.elements.push(structuredClone(document.elements[0]));
  const result = validateDocument(document);
  assert.equal(result.success, false);
  assert.deepEqual(result.issues[0].path, ["elements", 1, "id"]);
  assert.equal(
    validateDocument({ ...fixture(), elements: [{}] }).success,
    false,
  );
  assert.equal(
    validateDocument({ ...fixture(), elements: new Array(1) }).success,
    false,
  );
});

test("rejects invalid styles and accepts zero-width strokes", () => {
  for (const [key, value] of [
    ["fill", "url(https://example.com)"],
    ["stroke", "red"],
    ["textColor", "#fff"],
    ["strokeWidth", -1],
    ["strokeWidth", Infinity],
  ]) {
    const document = fixture();
    document.elements[0].style[key] = value;
    assert.equal(validateDocument(document).success, false);
  }
  const document = fixture();
  document.elements[0].style.strokeWidth = 0;
  assert.equal(validateDocument(document).success, true);
});
