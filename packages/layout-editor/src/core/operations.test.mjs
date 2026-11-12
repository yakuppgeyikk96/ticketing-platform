import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addRectangle,
  duplicateRectangle,
  reorderRectangle,
  moveRectangleToIndex,
  setRectangleBounds,
  resizeFromCorner,
  moveRectangle,
  resizeRectangle,
  rotateRectangle,
  deleteRectangle,
  setRectangleLabel,
  setRectangleColor,
  createHistory,
  commitDocument,
  undo,
  redo,
} from "../index.ts";

function rectangle(id = "stage") {
  return {
    id,
    type: "rectangle",
    x: 10,
    y: 20,
    width: 400,
    height: 100,
    rotation: 0,
    label: "Stage",
    style: {
      fill: "#444444",
      stroke: "#222222",
      strokeWidth: 1,
      textColor: "#ffffff",
    },
  };
}

test("label edits preserve geometry, order and the original document", () => {
  const document = addRectangle(
    addRectangle(emptyDocument(), rectangle()),
    rectangle("other"),
  );
  const before = structuredClone(document);
  Object.freeze(document.elements[0]);
  Object.freeze(document.elements);
  Object.freeze(document);
  const next = setRectangleLabel(document, "stage", "Ana Sahne — 舞台");
  assert.deepEqual(next.elements[0], {
    ...before.elements[0],
    label: "Ana Sahne — 舞台",
  });
  assert.equal(next.elements[1], document.elements[1]);
  assert.deepEqual(document, before);
  assert.equal(setRectangleLabel(next, "stage", "").elements[0].label, "");
});

test("label edits reject unknown IDs and invalid runtime data", () => {
  const document = addRectangle(emptyDocument(), rectangle());
  assert.throws(
    () => setRectangleLabel(document, "missing", "Label"),
    /Rectangle not found/,
  );
  assert.throws(
    () => setRectangleLabel(document, "stage", null),
    /elements\.0\.label:/,
  );
  assert.equal(document.elements[0].label, "Stage");
});

test("label edits undo and redo in one step; unchanged labels add no history", () => {
  const initial = createHistory(addRectangle(emptyDocument(), rectangle()));
  const edited = commitDocument(
    initial,
    setRectangleLabel(initial.present, "stage", ""),
  );
  assert.equal(edited.past.length, 1);
  assert.equal(
    commitDocument(edited, setRectangleLabel(edited.present, "stage", "")),
    edited,
  );
  assert.equal(undo(edited).present.elements[0].label, "Stage");
  assert.equal(redo(undo(edited)).present.elements[0].label, "");
});

function emptyDocument() {
  return { formatVersion: 1, width: 1200, height: 800, elements: [] };
}

test("deletion is one undoable edit restoring the original identity, styles and stacking order", () => {
  const input = addRectangle(
    addRectangle(emptyDocument(), rectangle("first")),
    rectangle("second"),
  );
  const initial = createHistory(input);
  const deleted = commitDocument(
    initial,
    deleteRectangle(initial.present, "first"),
  );
  assert.equal(deleted.past.length, 1);
  assert.deepEqual(
    deleted.present.elements.map((element) => element.id),
    ["second"],
  );
  assert.deepEqual(undo(deleted).present, input);
  assert.deepEqual(redo(undo(deleted)).present, deleted.present);
});

test("color edits copy the selected style without changing other fields or inputs", () => {
  const document = addRectangle(
    addRectangle(emptyDocument(), rectangle()),
    rectangle("other"),
  );
  const before = structuredClone(document);
  Object.freeze(document.elements[0].style);
  Object.freeze(document.elements[0]);
  for (const property of ["fill", "stroke", "textColor"]) {
    const next = setRectangleColor(document, "stage", property, "#123abc");
    assert.deepEqual(next.elements[0], {
      ...before.elements[0],
      style: { ...before.elements[0].style, [property]: "#123abc" },
    });
    assert.notEqual(next.elements[0].style, document.elements[0].style);
    assert.equal(next.elements[1], document.elements[1]);
  }
  assert.deepEqual(document, before);
});

test("color edits reject unknown IDs and invalid colors", () => {
  const document = addRectangle(emptyDocument(), rectangle());
  assert.throws(
    () => setRectangleColor(document, "missing", "fill", "#123abc"),
    /Rectangle not found/,
  );
  for (const color of ["red", "#fff", "", "url(https://example.com)", null]) {
    assert.throws(
      () => setRectangleColor(document, "stage", "fill", color),
      /elements\.0\.style\.fill:/,
    );
  }
  assert.equal(document.elements[0].style.fill, "#444444");
});

test("color commits undo in one step and unchanged colors preserve history", () => {
  const initial = createHistory(addRectangle(emptyDocument(), rectangle()));
  const edited = commitDocument(
    initial,
    setRectangleColor(initial.present, "stage", "fill", "#123abc"),
  );
  assert.equal(edited.past.length, 1);
  assert.equal(
    commitDocument(
      edited,
      setRectangleColor(edited.present, "stage", "fill", "#123abc"),
    ),
    edited,
  );
  assert.equal(undo(edited).present.elements[0].style.fill, "#444444");
  assert.equal(redo(undo(edited)).present.elements[0].style.fill, "#123abc");
});

test("rotation normalizes absolute angles and preserves other properties", () => {
  const document = addRectangle(
    addRectangle(emptyDocument(), rectangle("first")),
    rectangle("second"),
  );
  const before = structuredClone(document);
  Object.freeze(document.elements[0]);
  Object.freeze(document.elements);
  Object.freeze(document);
  for (const [angle, expected] of [
    [45, 45],
    [450, 90],
    [-90, 270],
    [720, 0],
    [-360, 0],
    [-0, 0],
    [12.5, 12.5],
    [0.1, 0.1],
  ]) {
    const next = rotateRectangle(document, "first", angle);
    assert.deepEqual(next.elements[0], {
      ...before.elements[0],
      rotation: expected,
    });
    assert.equal(next.elements[1], document.elements[1]);
    assert.notEqual(next, document);
    assert.notEqual(next.elements, document.elements);
  }
  assert.deepEqual(document, before);
});

test("rotation rejects missing IDs and nonfinite angles", () => {
  const document = addRectangle(emptyDocument(), rectangle());
  assert.throws(
    () => rotateRectangle(document, "missing", 45),
    /Rectangle not found/,
  );
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(
      () => rotateRectangle(document, "stage", value),
      /finite number/,
    );
  }
  assert.equal(document.elements[0].rotation, 0);
});

test("deletion preserves remaining identities and order without mutating input", () => {
  let document = emptyDocument();
  for (const id of ["first", "middle", "last"])
    document = addRectangle(document, rectangle(id));
  const before = structuredClone(document);
  Object.freeze(document.elements);
  Object.freeze(document);
  const next = deleteRectangle(document, "middle");
  assert.deepEqual(
    next.elements.map((element) => element.id),
    ["first", "last"],
  );
  assert.equal(next.elements[0], document.elements[0]);
  assert.equal(next.elements[1], document.elements[2]);
  assert.deepEqual(document, before);
  assert.notEqual(next, document);
  assert.notEqual(next.elements, document.elements);
  const single = addRectangle(emptyDocument(), rectangle());
  assert.deepEqual(deleteRectangle(single, "stage").elements, []);
});

test("deletion rejects missing IDs and invalid documents", () => {
  const document = addRectangle(emptyDocument(), rectangle());
  assert.throws(
    () => deleteRectangle(document, "missing"),
    /Rectangle not found/,
  );
  assert.throws(
    () => deleteRectangle(emptyDocument(), "missing"),
    /Rectangle not found/,
  );
  const invalid = {
    ...document,
    elements: [{ ...document.elements[0], width: 0 }],
  };
  assert.throws(() => deleteRectangle(invalid, "stage"), /elements\.0\.width:/);
  assert.equal(document.elements.length, 1);
});

test("resizing changes only dimensions and preserves rotated geometry and order", () => {
  const document = addRectangle(
    addRectangle(emptyDocument(), { ...rectangle("first"), rotation: 45 }),
    rectangle("second"),
  );
  const before = structuredClone(document);
  for (const element of document.elements) {
    Object.freeze(element.style);
    Object.freeze(element);
  }
  Object.freeze(document.elements);
  Object.freeze(document);
  const size = { width: 50.5, height: 200.25 };
  const resized = resizeRectangle(document, "first", size);
  assert.deepEqual(resized.elements[0], { ...before.elements[0], ...size });
  assert.equal(resized.elements[1], document.elements[1]);
  assert.deepEqual(document, before);
  assert.notEqual(resized, document);
  assert.notEqual(resized.elements, document.elements);
  size.width = 999;
  assert.equal(resized.elements[0].width, 50.5);
});

test("resizing rejects missing IDs and invalid dimensions without mutating inputs", () => {
  const document = addRectangle(emptyDocument(), rectangle());
  const before = structuredClone(document);
  assert.throws(
    () => resizeRectangle(document, "missing", { width: 1, height: 1 }),
    /Rectangle not found: missing/,
  );
  for (const field of ["width", "height"]) {
    for (const value of [0, -1, NaN, Infinity]) {
      assert.throws(
        () =>
          resizeRectangle(document, "stage", {
            width: 100,
            height: 100,
            [field]: value,
          }),
        new RegExp(`elements\\.0\\.${field}:`),
      );
    }
  }
  assert.deepEqual(document, before);
});

test("moves only the selected rectangle to absolute coordinates without changing order", () => {
  const document = addRectangle(
    addRectangle(emptyDocument(), rectangle("first")),
    rectangle("second"),
  );
  const before = structuredClone(document);
  for (const element of document.elements) {
    Object.freeze(element.style);
    Object.freeze(element);
  }
  Object.freeze(document.elements);
  Object.freeze(document);
  const position = { x: -30.5, y: 0 };
  const moved = moveRectangle(document, "first", position);
  assert.deepEqual(moved.elements[0], {
    ...before.elements[0],
    x: -30.5,
    y: 0,
  });
  assert.equal(moved.elements[1], document.elements[1]);
  assert.deepEqual(
    moved.elements.map((element) => element.id),
    ["first", "second"],
  );
  assert.deepEqual(document, before);
  assert.notEqual(moved, document);
  position.x = 999;
  assert.equal(moved.elements[0].x, -30.5);
});

test("moving rejects missing IDs and nonfinite positions without changing inputs", () => {
  const document = addRectangle(emptyDocument(), rectangle());
  const before = structuredClone(document);
  assert.throws(
    () => moveRectangle(document, "missing", { x: 0, y: 0 }),
    /Rectangle not found: missing/,
  );
  for (const position of [
    { x: NaN, y: 0 },
    { x: 0, y: Infinity },
  ]) {
    assert.throws(
      () => moveRectangle(document, "stage", position),
      /Expected a finite number/,
    );
  }
  assert.deepEqual(document, before);
});

test("adds a rectangle to an empty document, preserving its supplied ID", () => {
  const document = emptyDocument();
  const element = rectangle();
  const next = addRectangle(document, element);
  assert.deepEqual(next, { ...document, elements: [element] });
  assert.notEqual(next, document);
  assert.notEqual(next.elements, document.elements);
  assert.deepEqual(document.elements, []);
});

test("appends above existing elements without mutating frozen inputs", () => {
  const existing = rectangle("existing");
  Object.freeze(existing.style);
  Object.freeze(existing);
  const document = Object.freeze({
    ...emptyDocument(),
    elements: Object.freeze([existing]),
  });
  const element = rectangle("new");
  Object.freeze(element.style);
  Object.freeze(element);
  const next = addRectangle(document, element);
  assert.deepEqual(
    next.elements.map((item) => item.id),
    ["existing", "new"],
  );
  assert.equal(next.elements[0], existing);
  assert.deepEqual(document.elements, [existing]);
});

test("copies the added rectangle and its style", () => {
  const element = rectangle();
  const next = addRectangle(emptyDocument(), element);
  element.x = 999;
  element.style.fill = "#ffffff";
  assert.equal(next.elements[0].x, 10);
  assert.equal(next.elements[0].style.fill, "#444444");
});

test("rejects duplicate IDs without modifying the document", () => {
  const document = addRectangle(emptyDocument(), rectangle());
  const before = structuredClone(document);
  assert.throws(
    () => addRectangle(document, rectangle()),
    /elements\.1\.id: Duplicate element ID/,
  );
  assert.deepEqual(document, before);
});

test("rejects invalid rectangles and invalid existing document data", () => {
  const document = emptyDocument();
  assert.throws(
    () => addRectangle(document, { ...rectangle(), width: 0 }),
    /elements\.0\.width:/,
  );
  assert.throws(
    () => addRectangle({ ...document, height: -1 }, rectangle()),
    /height:/,
  );
  const invalid = {
    ...document,
    elements: [{ ...rectangle("existing"), x: NaN }],
  };
  assert.throws(() => addRectangle(invalid, rectangle()), /elements\.0\.x:/);
  assert.deepEqual(document.elements, []);
});

test("corner resize commits position and dimensions together and undoes in one step", () => {
  const input = addRectangle(emptyDocument(), { ...rectangle(), rotation: 37 });
  const before = structuredClone(input);
  const bounds = resizeFromCorner(input.elements[0], "nw", { x: -100, y: -50 });
  const next = setRectangleBounds(input, "stage", bounds);
  assert.deepEqual(next.elements[0], { ...input.elements[0], ...bounds });
  assert.deepEqual(input, before);
  const history = commitDocument(createHistory(input), next);
  assert.deepEqual(undo(history).present, input);
  assert.deepEqual(redo(undo(history)).present, next);
});

test("atomic bounds updates reject invalid geometry and unknown IDs", () => {
  const input = addRectangle(emptyDocument(), rectangle());
  const bounds = { x: 10, y: 20, width: 100, height: 50 };
  assert.throws(() => setRectangleBounds(input, "missing", bounds));
  assert.throws(() =>
    setRectangleBounds(input, "stage", { ...bounds, width: 0 }),
  );
  assert.throws(() =>
    setRectangleBounds(input, "stage", { ...bounds, x: NaN }),
  );
  assert.equal(input.elements[0].width, 400);
});

function layeredDocument() {
  return ["a", "b", "c", "d"].reduce(
    (doc, id) => addRectangle(doc, rectangle(id)),
    emptyDocument(),
  );
}

test("layer actions reorder paint order while preserving identities, geometry and other elements", () => {
  const input = layeredDocument();
  const before = structuredClone(input);
  input.elements.forEach(Object.freeze);
  Object.freeze(input.elements);
  Object.freeze(input);
  for (const [action, expected] of [
    ["forward", ["a", "c", "b", "d"]],
    ["backward", ["b", "a", "c", "d"]],
    ["front", ["a", "c", "d", "b"]],
    ["back", ["b", "a", "c", "d"]],
  ]) {
    const next = reorderRectangle(input, "b", action);
    assert.deepEqual(
      next.elements.map((item) => item.id),
      expected,
    );
    for (const element of next.elements)
      assert.equal(
        element,
        input.elements.find((item) => item.id === element.id),
      );
  }
  assert.deepEqual(
    reorderRectangle(input, "c", "back").elements.map((item) => item.id),
    ["c", "a", "b", "d"],
  );
  assert.deepEqual(input, before);
});

test("layer boundaries are no-ops and preserve pending redo", () => {
  const input = layeredDocument();
  for (const [id, action] of [
    ["a", "back"],
    ["a", "backward"],
    ["d", "front"],
    ["d", "forward"],
  ])
    assert.equal(reorderRectangle(input, id, action), input);
  const history = undo(
    commitDocument(createHistory(input), reorderRectangle(input, "b", "front")),
  );
  assert.equal(
    commitDocument(history, reorderRectangle(history.present, "a", "back")),
    history,
  );
});

test("reordering undoes in one step, survives serialization, and new edits clear redo", () => {
  const input = layeredDocument();
  const next = reorderRectangle(input, "b", "front");
  const history = commitDocument(createHistory(input), next);
  assert.equal(history.past.length, 1);
  assert.deepEqual(undo(history).present, input);
  assert.deepEqual(redo(undo(history)).present, next);
  assert.equal(
    commitDocument(undo(history), reorderRectangle(input, "c", "back")).future
      .length,
    0,
  );
});

test("layer ordering rejects missing IDs, unknown actions and invalid documents", () => {
  const input = layeredDocument();
  assert.throws(() => reorderRectangle(input, "missing", "front"));
  assert.throws(() => reorderRectangle(input, "b", "invalid"));
  assert.throws(() => reorderRectangle({ ...input, width: 0 }, "d", "front"));
  const single = addRectangle(emptyDocument(), rectangle());
  for (const action of ["front", "back", "forward", "backward"])
    assert.equal(reorderRectangle(single, "stage", action), single);
});

test("dropping at a final layer index is immutable and commits a single undoable edit", () => {
  const input = layeredDocument();
  const original = structuredClone(input);
  Object.freeze(input.elements);
  const next = moveRectangleToIndex(input, "a", 3);
  assert.deepEqual(
    next.elements.map((item) => item.id),
    ["b", "c", "d", "a"],
  );
  assert.deepEqual(moveRectangleToIndex(next, "a", 0), input);
  assert.deepEqual(input, original);
  assert.equal(next.elements[3], input.elements[0]);
  const history = commitDocument(createHistory(input), next);
  assert.equal(history.past.length, 1);
  assert.deepEqual(undo(history).present, input);
  assert.deepEqual(redo(undo(history)).present, next);
  assert.equal(moveRectangleToIndex(input, "b", 1), input);
});

test("invalid layer indices and missing elements cannot alter document order", () => {
  const input = layeredDocument();
  for (const index of [-1, 4, 1.5, NaN, Infinity])
    assert.throws(() => moveRectangleToIndex(input, "a", index));
  assert.throws(() => moveRectangleToIndex(input, "missing", 0));
  assert.throws(() => moveRectangleToIndex({ ...input, width: 0 }, "a", 0));
});

test("duplication creates an independent offset copy at the front without changing the source", () => {
  const input = addRectangle(
    addRectangle(emptyDocument(), { ...rectangle(), rotation: 37 }),
    rectangle("other"),
  );
  const before = structuredClone(input);
  Object.freeze(input.elements[0].style);
  Object.freeze(input.elements[0]);
  Object.freeze(input.elements);
  const next = duplicateRectangle(input, "stage", "copy");
  assert.deepEqual(
    next.elements.map((element) => element.id),
    ["stage", "other", "copy"],
  );
  assert.deepEqual(next.elements[2], {
    ...input.elements[0],
    id: "copy",
    x: 34,
    y: 44,
  });
  assert.notEqual(next.elements[2].style, input.elements[0].style);
  next.elements[2].style.fill = "#ff0000";
  assert.deepEqual(input, before);
  const repeated = duplicateRectangle(next, "copy", "copy2");
  assert.equal(repeated.elements[3].x, 58);
  assert.equal(repeated.elements[3].y, 68);
});

test("duplication is one reversible edit and redo restores the same copy identity", () => {
  const input = addRectangle(emptyDocument(), rectangle());
  const next = duplicateRectangle(input, "stage", "copy");
  const history = commitDocument(createHistory(input), next);
  assert.equal(history.past.length, 1);
  assert.deepEqual(undo(history).present, input);
  assert.deepEqual(redo(undo(history)).present, next);
  assert.equal(
    commitDocument(
      undo(history),
      duplicateRectangle(input, "stage", "different-copy"),
    ).future.length,
    0,
  );
});

test("duplication validates identity and geometry before adding anything", () => {
  const input = addRectangle(emptyDocument(), rectangle());
  assert.throws(() => duplicateRectangle(input, "missing", "copy"));
  assert.throws(() => duplicateRectangle(input, "stage", "stage"));
  assert.throws(() => duplicateRectangle(input, "stage", ""));
  assert.throws(() =>
    duplicateRectangle(input, "stage", "copy", { x: Infinity, y: 0 }),
  );
  assert.throws(() =>
    duplicateRectangle({ ...input, width: 0 }, "stage", "copy"),
  );
  assert.equal(input.elements.length, 1);
  const custom = duplicateRectangle(input, "stage", "copy", { x: -10, y: 0 });
  assert.equal(custom.elements[1].x, 0);
  assert.equal(custom.elements[1].y, 20);
});
