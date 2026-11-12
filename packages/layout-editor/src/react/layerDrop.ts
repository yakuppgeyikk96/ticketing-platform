import type { LayoutElement } from "../core/document.ts";

export type LayerDropEdge = "above" | "below";

/** The list runs front-to-back, opposite to the document's paint order. */
export function layerDropIndex(
  elements: readonly LayoutElement[],
  sourceId: string,
  targetId: string,
  edge: LayerDropEdge,
): number | null {
  if (
    sourceId === targetId ||
    !elements.some((element) => element.id === sourceId)
  )
    return null;
  const remaining = elements.filter((element) => element.id !== sourceId);
  const target = remaining.findIndex((element) => element.id === targetId);
  if (target < 0) return null;
  return target + (edge === "above" ? 1 : 0);
}
