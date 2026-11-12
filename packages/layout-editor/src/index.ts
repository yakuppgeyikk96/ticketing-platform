export type {
  LayoutDocument,
  LayoutElement,
  RectangleElement,
  RectangleStyle,
  RectangleColor,
} from "./core/document.ts";
export { validateDocument } from "./core/validation.ts";
export { parseDocument, serializeDocument } from "./core/serialization.ts";
export { createHistory, commitDocument, undo, redo } from "./core/history.ts";
export { getRectangleCorner, resizeFromCorner } from "./core/geometry.ts";
export type {
  ResizeCorner,
  RectangleGeometry,
  RectangleBounds,
  DocumentPoint,
} from "./core/geometry.ts";
export type { DocumentHistory } from "./core/history.ts";
export {
  addRectangle,
  duplicateRectangle,
  moveRectangle,
  resizeRectangle,
  rotateRectangle,
  deleteRectangle,
  setRectangleLabel,
  setRectangleColor,
  setRectangleBounds,
} from "./core/operations.ts";
export type {
  DocumentValidationIssue,
  DocumentValidationResult,
} from "./core/validation.ts";

export { reorderRectangle, moveRectangleToIndex } from "./core/operations.ts";
export type { LayerAction } from "./core/operations.ts";
