import type {
  LayoutDocument,
  RectangleElement,
  RectangleColor,
} from "./document.ts";
import { validateDocument } from "./validation.ts";
import type { RectangleBounds } from "./geometry.ts";

/** Applies position and dimensions atomically, preserving rotation and styling. */
export function setRectangleBounds(
  document: LayoutDocument,
  id: string,
  bounds: RectangleBounds,
): LayoutDocument {
  if (!document.elements.some((element) => element.id === id))
    throw new Error(`Rectangle not found: ${id}`);
  return checkedDocument({
    ...document,
    elements: document.elements.map((element) =>
      element.id === id
        ? {
            ...element,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          }
        : element,
    ),
  });
}

export function setRectangleColor(
  document: LayoutDocument,
  id: string,
  property: RectangleColor,
  color: string,
): LayoutDocument {
  if (!document.elements.some((element) => element.id === id))
    throw new Error(`Rectangle not found: ${id}`);
  return checkedDocument({
    ...document,
    elements: document.elements.map((element) =>
      element.id === id
        ? { ...element, style: { ...element.style, [property]: color } }
        : element,
    ),
  });
}

/** Sets plain label text, including an empty string to hide the label. */
export function setRectangleLabel(
  document: LayoutDocument,
  id: string,
  label: string,
): LayoutDocument {
  if (!document.elements.some((element) => element.id === id)) {
    throw new Error(`Rectangle not found: ${id}`);
  }
  return checkedDocument({
    ...document,
    elements: document.elements.map((element) =>
      element.id === id ? { ...element, label } : element,
    ),
  });
}

/** Sets an absolute clockwise angle around the center, normalized to [0, 360). */
export function rotateRectangle(
  document: LayoutDocument,
  id: string,
  degrees: number,
): LayoutDocument {
  if (!document.elements.some((element) => element.id === id)) {
    throw new Error(`Rectangle not found: ${id}`);
  }
  if (!Number.isFinite(degrees)) {
    throw new Error("Rotation must be a finite number");
  }
  const remainder = degrees % 360;
  const rotation =
    remainder < 0 ? remainder + 360 : remainder === 0 ? 0 : remainder;
  return checkedDocument({
    ...document,
    elements: document.elements.map((element) =>
      element.id === id ? { ...element, rotation } : element,
    ),
  });
}

/** Removes one rectangle without changing the order of the remaining elements. */
export function deleteRectangle(
  document: LayoutDocument,
  id: string,
): LayoutDocument {
  // Validate before removal so deleting an invalid element cannot hide bad input.
  checkedDocument(document);
  if (!document.elements.some((element) => element.id === id)) {
    throw new Error(`Rectangle not found: ${id}`);
  }
  return {
    ...document,
    elements: document.elements.filter((element) => element.id !== id),
  };
}

function checkedDocument(document: LayoutDocument): LayoutDocument {
  const result = validateDocument(document);
  if (!result.success) {
    const details = result.issues
      .map(({ path, message }) => `${path.join(".") || "document"}: ${message}`)
      .join("; ");
    throw new Error(`Invalid layout document: ${details}`);
  }
  return result.document;
}

/** Sets dimensions while preserving the unrotated top-left corner and rotation. */
export function resizeRectangle(
  document: LayoutDocument,
  id: string,
  size: { width: number; height: number },
): LayoutDocument {
  if (!document.elements.some((element) => element.id === id)) {
    throw new Error(`Rectangle not found: ${id}`);
  }
  const next: LayoutDocument = {
    ...document,
    elements: document.elements.map((element) =>
      element.id === id
        ? { ...element, width: size.width, height: size.height }
        : element,
    ),
  };
  const result = validateDocument(next);
  if (!result.success) {
    const details = result.issues
      .map(({ path, message }) => `${path.join(".") || "document"}: ${message}`)
      .join("; ");
    throw new Error(`Invalid layout document: ${details}`);
  }
  return next;
}

/** Moves a rectangle to an absolute document position; drawing order is unchanged. */
export function moveRectangle(
  document: LayoutDocument,
  id: string,
  position: { x: number; y: number },
): LayoutDocument {
  if (!document.elements.some((element) => element.id === id)) {
    throw new Error(`Rectangle not found: ${id}`);
  }
  const next: LayoutDocument = {
    ...document,
    elements: document.elements.map((element) =>
      element.id === id
        ? { ...element, x: position.x, y: position.y }
        : element,
    ),
  };
  const result = validateDocument(next);
  if (!result.success) {
    const details = result.issues
      .map(({ path, message }) => `${path.join(".") || "document"}: ${message}`)
      .join("; ");
    throw new Error(`Invalid layout document: ${details}`);
  }
  return next;
}

/** Appends a rectangle at the front of the drawing without mutating the input. */
export function addRectangle(
  document: LayoutDocument,
  rectangle: RectangleElement,
): LayoutDocument {
  const next = { ...document, elements: [...document.elements, rectangle] };
  const result = validateDocument(next);
  if (!result.success) {
    const details = result.issues
      .map(({ path, message }) => `${path.join(".") || "document"}: ${message}`)
      .join("; ");
    throw new Error(`Invalid layout document: ${details}`);
  }

  // Own the new element's mutable data so later caller edits cannot change it.
  return {
    ...next,
    elements: [
      ...document.elements,
      { ...rectangle, style: { ...rectangle.style } },
    ],
  };
}

export type LayerAction = "forward" | "backward" | "front" | "back";

/** Array order is paint order: the last element is in front. */
export function reorderRectangle(
  document: LayoutDocument,
  id: string,
  action: LayerAction,
): LayoutDocument {
  checkedDocument(document);
  const index = document.elements.findIndex((element) => element.id === id);
  if (index < 0) throw new Error(`Rectangle not found: ${id}`);
  let target: number;
  switch (action) {
    case "forward":
      target = Math.min(index + 1, document.elements.length - 1);
      break;
    case "backward":
      target = Math.max(index - 1, 0);
      break;
    case "front":
      target = document.elements.length - 1;
      break;
    case "back":
      target = 0;
      break;
    default:
      throw new Error(`Unknown layer action: ${String(action)}`);
  }
  return moveRectangleToIndex(document, id, target);
}

/** Moves to a final paint-order index in one edit; the last index is the front. */
export function moveRectangleToIndex(
  document: LayoutDocument,
  id: string,
  target: number,
): LayoutDocument {
  checkedDocument(document);
  const index = document.elements.findIndex((element) => element.id === id);
  if (index < 0) throw new Error(`Rectangle not found: ${id}`);
  if (
    !Number.isInteger(target) ||
    target < 0 ||
    target >= document.elements.length
  )
    throw new Error(
      "Layer index must be an integer within the document's element range",
    );
  if (index === target) return document;
  const elements = [...document.elements];
  const [element] = elements.splice(index, 1);
  if (!element) throw new Error(`Rectangle not found: ${id}`);
  elements.splice(target, 0, element);
  return { ...document, elements };
}

/** Creates an independent copy at the front, offset in document coordinates. */
export function duplicateRectangle(
  document: LayoutDocument,
  id: string,
  newId: string,
  offset = { x: 24, y: 24 },
): LayoutDocument {
  const source = document.elements.find((element) => element.id === id);
  if (!source) throw new Error(`Rectangle not found: ${id}`);
  return addRectangle(document, {
    ...source,
    id: newId,
    x: source.x + offset.x,
    y: source.y + offset.y,
    style: { ...source.style },
  });
}
