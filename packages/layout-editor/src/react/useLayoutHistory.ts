import { useRef, useState } from "react";
import type {
  LayoutDocument,
  RectangleColor,
  RectangleElement,
} from "../core/document.ts";
import type { RectangleBounds } from "../core/geometry.ts";
import {
  createHistory,
  commitDocument,
  undo,
  redo,
  type DocumentHistory,
} from "../core/history.ts";
import {
  reorderRectangle,
  moveRectangleToIndex,
  type LayerAction,
  moveRectangle,
  resizeRectangle,
  rotateRectangle,
  setRectangleLabel,
  setRectangleColor,
  addRectangle,
  duplicateRectangle,
  deleteRectangle,
  setRectangleBounds,
} from "../core/operations.ts";

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

export function useLayoutHistory(
  initialDocument: LayoutDocument,
  onDocumentChange?: (document: LayoutDocument) => void,
  onHistoryChange?: (state: HistoryState) => void,
) {
  const [history, setHistory] = useState(() => createHistory(initialDocument));
  const current = useRef(history);
  function publish(next: DocumentHistory) {
    if (next === current.current) return;
    current.current = next;
    setHistory(next);
    onDocumentChange?.(next.present);
    onHistoryChange?.({
      canUndo: next.past.length > 0,
      canRedo: next.future.length > 0,
    });
  }
  return {
    document: history.present,
    duplicate: (id: string, newId: string) =>
      publish(
        commitDocument(
          current.current,
          duplicateRectangle(current.current.present, id, newId),
        ),
      ),
    moveToIndex: (id: string, index: number) =>
      publish(
        commitDocument(
          current.current,
          moveRectangleToIndex(current.current.present, id, index),
        ),
      ),
    reorder: (id: string, action: LayerAction) =>
      publish(
        commitDocument(
          current.current,
          reorderRectangle(current.current.present, id, action),
        ),
      ),
    setBounds: (id: string, bounds: RectangleBounds) =>
      publish(
        commitDocument(
          current.current,
          setRectangleBounds(current.current.present, id, bounds),
        ),
      ),
    remove: (id: string) =>
      publish(
        commitDocument(
          current.current,
          deleteRectangle(current.current.present, id),
        ),
      ),
    add: (rectangle: RectangleElement) =>
      publish(
        commitDocument(
          current.current,
          addRectangle(current.current.present, rectangle),
        ),
      ),
    setColor: (id: string, property: RectangleColor, color: string) =>
      publish(
        commitDocument(
          current.current,
          setRectangleColor(current.current.present, id, property, color),
        ),
      ),
    setLabel: (id: string, label: string) =>
      publish(
        commitDocument(
          current.current,
          setRectangleLabel(current.current.present, id, label),
        ),
      ),
    rotate: (id: string, degrees: number): number => {
      const next = rotateRectangle(current.current.present, id, degrees);
      publish(commitDocument(current.current, next));
      const element = next.elements.find((item) => item.id === id);
      if (!element) throw new Error(`Rectangle not found: ${id}`);
      return element.rotation;
    },
    resize: (id: string, size: { width: number; height: number }) =>
      publish(
        commitDocument(
          current.current,
          resizeRectangle(current.current.present, id, size),
        ),
      ),
    move: (id: string, position: { x: number; y: number }) =>
      publish(
        commitDocument(
          current.current,
          moveRectangle(current.current.present, id, position),
        ),
      ),
    undo: () => publish(undo(current.current)),
    redo: () => publish(redo(current.current)),
  };
}
