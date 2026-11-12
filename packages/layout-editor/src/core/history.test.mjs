import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createHistory,
  commitDocument,
  undo,
  redo,
  rotateRectangle,
} from "../index.ts";

function document(width = 1200) {
  return { formatVersion: 1, width, height: 800, elements: [] };
}

test("rotation commits normalize angles, undo in one step, and ignore equivalent angles", () => {
  const input = {
    ...document(),
    elements: [
      {
        id: "stage",
        type: "rectangle",
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        rotation: 0,
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
  const initial = createHistory(input);
  const rotated = commitDocument(
    initial,
    rotateRectangle(initial.present, "stage", 450),
  );
  assert.equal(rotated.present.elements[0].rotation, 90);
  assert.equal(rotated.past.length, 1);
  assert.equal(
    commitDocument(rotated, rotateRectangle(rotated.present, "stage", 810)),
    rotated,
  );
  assert.equal(undo(rotated).present.elements[0].rotation, 0);
  assert.equal(redo(undo(rotated)).present.elements[0].rotation, 90);
});

test("undo and redo traverse completed edits in order without mutating history", () => {
  const initial = createHistory(document());
  const first = commitDocument(initial, document(1000));
  const second = commitDocument(first, document(900));
  Object.freeze(second.past);
  Object.freeze(second.future);
  Object.freeze(second);
  const back = undo(second);
  assert.equal(back.present.width, 1000);
  assert.equal(undo(back).present.width, 1200);
  assert.equal(redo(back).present.width, 900);
  assert.equal(redo(redo(undo(back))).present.width, 900);
  assert.equal(initial.present.width, 1200);
  assert.equal(second.present.width, 900);
});

test("empty undo and redo return the same history", () => {
  const history = createHistory(document());
  assert.equal(undo(history), history);
  assert.equal(redo(history), history);
});

test("new edits clear redo while unchanged commits preserve it", () => {
  const history = undo(
    commitDocument(createHistory(document()), document(1000)),
  );
  assert.equal(commitDocument(history, document()), history);
  const edited = commitDocument(history, document(700));
  assert.deepEqual(edited.future, []);
  assert.equal(redo(edited), edited);
  assert.equal(undo(edited).present.width, 1200);
});

test("history limit discards the oldest undo entries", () => {
  let history = createHistory(document(100), 2);
  for (const width of [200, 300, 400])
    history = commitDocument(history, document(width));
  assert.deepEqual(
    history.past.map((item) => item.width),
    [200, 300],
  );
  const oldest = undo(undo(history));
  assert.equal(oldest.present.width, 200);
  assert.equal(undo(oldest), oldest);
  const restored = redo(redo(oldest));
  assert.equal(restored.present.width, 400);
  assert.equal(restored.past.length, 2);
});

test("creation and commits detach caller-owned documents", () => {
  const input = document();
  const initial = createHistory(input);
  input.width = 999;
  assert.equal(initial.present.width, 1200);
  const next = document(700);
  const committed = commitDocument(initial, next);
  next.width = 999;
  assert.equal(committed.present.width, 700);
});

test("rejects invalid history limits and document data", () => {
  for (const limit of [0, -1, 1.5, Infinity, NaN]) {
    assert.throws(() => createHistory(document(), limit), /History limit/);
  }
  assert.throws(() => createHistory(document(0)), /width:/);
  const history = createHistory(document());
  assert.throws(() => commitDocument(history, document(0)), /width:/);
  assert.equal(history.present.width, 1200);
  assert.deepEqual(history.past, []);
});
