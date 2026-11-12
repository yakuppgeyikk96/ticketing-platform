import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDocument, serializeDocument } from "../index.ts";

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
        label: "Sahne — 舞台",
        style: {
          fill: "#444444",
          stroke: "#222222",
          strokeWidth: 0,
          textColor: "#ffffff",
        },
      },
      {
        id: "curtain",
        type: "rectangle",
        x: 100,
        y: 30,
        width: 400,
        height: 10,
        rotation: 0,
        label: "Curtain",
        style: {
          fill: "#aa0000",
          stroke: "#222222",
          strokeWidth: 1,
          textColor: "#ffffff",
        },
      },
    ],
  };
}

test("JSON round trip preserves element identities, order, geometry and styles", () => {
  const document = fixture();
  const before = structuredClone(document);
  const restored = parseDocument(serializeDocument(document));
  assert.deepEqual(restored, document);
  assert.notEqual(restored, document);
  assert.deepEqual(document, before);
});

test("empty documents round trip", () => {
  const document = { ...fixture(), elements: [] };
  assert.deepEqual(parseDocument(serializeDocument(document)), document);
});

test("malformed JSON retains its native SyntaxError", () => {
  assert.throws(() => parseDocument('{"formatVersion":'), SyntaxError);
});

test("parse errors include field paths and validation messages", () => {
  const document = fixture();
  document.elements[0].width = 0;
  document.height = -1;
  assert.throws(
    () => parseDocument(JSON.stringify(document)),
    (error) => {
      assert.match(error.message, /Invalid layout document:/);
      assert.match(
        error.message,
        /elements\.0\.width: Expected a finite number > 0/,
      );
      assert.match(error.message, /height:/);
      return true;
    },
  );
  assert.throws(() => parseDocument("null"), /document: Expected an object/);
});

test("serialization validates runtime values before JSON can discard invalid numbers", () => {
  const document = fixture();
  document.elements[0].x = NaN;
  assert.throws(
    () => serializeDocument(document),
    /elements\.0\.x: Expected a finite number/,
  );
});

test("unsupported versions and duplicate IDs are rejected on loading", () => {
  const document = fixture();
  document.formatVersion = 2;
  assert.throws(
    () => parseDocument(JSON.stringify(document)),
    /formatVersion:/,
  );
  document.formatVersion = 1;
  document.elements[1].id = document.elements[0].id;
  assert.throws(
    () => parseDocument(JSON.stringify(document)),
    /elements\.1\.id: Duplicate element ID/,
  );
});
