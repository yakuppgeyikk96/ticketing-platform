import type { LayoutDocument } from "./document.ts";
import { parseDocument, serializeDocument } from "./serialization.ts";

/** Treat history and its documents as immutable; edit through document operations. */
export interface DocumentHistory {
  readonly past: readonly LayoutDocument[];
  readonly present: LayoutDocument;
  readonly future: readonly LayoutDocument[];
  /** Maximum number of undoable completed edits. */
  readonly limit: number;
}

export function createHistory(
  document: LayoutDocument,
  limit = 100,
): DocumentHistory {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("History limit must be a positive safe integer");
  }
  return { past: [], present: snapshot(document), future: [], limit };
}

/** Call once on edit completion, never for intermediate pointer movements. */
export function commitDocument(
  history: DocumentHistory,
  document: LayoutDocument,
): DocumentHistory {
  const next = snapshot(document);
  // Equal content is not an edit and must not erase a pending redo.
  if (serializeDocument(next) === serializeDocument(history.present))
    return history;
  return {
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: [],
    limit: history.limit,
  };
}

export function undo(history: DocumentHistory): DocumentHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    limit: history.limit,
  };
}

export function redo(history: DocumentHistory): DocumentHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: history.future.slice(1),
    limit: history.limit,
  };
}

function snapshot(document: LayoutDocument): LayoutDocument {
  // Validate and detach caller-owned data at the commit boundary.
  return parseDocument(serializeDocument(document));
}
