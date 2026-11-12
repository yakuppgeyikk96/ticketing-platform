import { useRef, useEffect, type PointerEvent } from "react";
import type { LayoutDocument, RectangleElement } from "../core/document.ts";
import {
  getRectangleCorner,
  type ResizeCorner,
  type RectangleBounds,
} from "../core/geometry.ts";
import { resizeRectangleBounds } from "./grid.ts";
import { useAltSnap } from "./useAltSnap.ts";
import { clientToDocument } from "./coordinates.ts";
import { paintResize } from "./resizePreview.ts";

export function useRectangleResize(
  document: LayoutDocument,
  onCommit: (id: string, bounds: RectangleBounds) => void,
) {
  const active = useRef<{
    snap: boolean;
    original: RectangleElement;
    bounds: RectangleBounds;
    corner: ResizeCorner;
    pointerId: number;
    clientX: number;
    clientY: number;
    moved: boolean;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    svg: SVGSVGElement;
    node: SVGGElement;
    controls: SVGGElement | null;
    handle: SVGGElement;
  } | null>(null);
  const frame = useRef<number | null>(null);
  const skipClick = useRef(false);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      active.current = null;
    },
    [],
  );

  function update(
    event: Pick<PointerEvent, "pointerId" | "clientX" | "clientY"> & {
      altKey?: boolean;
    },
  ) {
    const gesture = active.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (event.altKey !== undefined) gesture.snap = event.altKey;
    gesture.clientX = event.clientX;
    gesture.clientY = event.clientY;
    gesture.moved ||=
      Math.hypot(
        event.clientX - gesture.startX,
        event.clientY - gesture.startY,
      ) >= 0.5;
    if (!gesture.moved) return;
    const point = clientToDocument(gesture.svg, event.clientX, event.clientY);
    if (!point) return;
    gesture.bounds = resizeRectangleBounds(
      gesture.original,
      gesture.corner,
      {
        x: point.x - gesture.offsetX,
        y: point.y - gesture.offsetY,
      },
      gesture.snap,
    );
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (active.current !== gesture) return;
      paintResize(gesture.node, gesture.controls, {
        ...gesture.original,
        ...gesture.bounds,
      });
    });
  }
  useAltSnap((pressed) => {
    const gesture = active.current;
    if (!gesture) return false;
    gesture.snap = pressed;
    update({
      pointerId: gesture.pointerId,
      clientX: gesture.clientX,
      clientY: gesture.clientY,
    });
    return true;
  });
  function cancel() {
    const gesture = active.current;
    if (!gesture) return false;
    active.current = null;
    skipClick.current = true;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    paintResize(gesture.node, gesture.controls, gesture.original);
    if (gesture.handle.hasPointerCapture(gesture.pointerId))
      gesture.handle.releasePointerCapture(gesture.pointerId);
    return true;
  }
  return {
    isActive: () => active.current !== null,
    cancel,
    clearClick: () => {
      skipClick.current = false;
    },
    consumeClick: () => {
      const skip = skipClick.current;
      skipClick.current = false;
      return skip;
    },
    reproject: () => {
      const gesture = active.current;
      if (gesture)
        update({
          pointerId: gesture.pointerId,
          clientX: gesture.clientX,
          clientY: gesture.clientY,
        });
    },
    start: (
      id: string,
      corner: ResizeCorner,
      event: PointerEvent<SVGGElement>,
    ) => {
      if (event.button !== 0 || active.current) return;
      const svg = event.currentTarget.ownerSVGElement;
      const original = document.elements.find((element) => element.id === id);
      if (!svg || !original) return;
      const point = clientToDocument(svg, event.clientX, event.clientY);
      const node = Array.from(
        svg.querySelectorAll<SVGGElement>("[data-element-id]"),
      ).find((element) => element.getAttribute("data-element-id") === id);
      if (!point || !node) return;
      event.preventDefault();
      event.stopPropagation();
      svg.focus();
      const actualCorner = getRectangleCorner(original, corner);
      active.current = {
        original,
        snap: event.altKey,
        corner,
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        moved: false,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: point.x - actualCorner.x,
        offsetY: point.y - actualCorner.y,
        svg,
        node,
        controls: svg.querySelector<SVGGElement>("[data-selection-controls]"),
        handle: event.currentTarget,
        bounds: {
          x: original.x,
          y: original.y,
          width: original.width,
          height: original.height,
        },
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    move: update,
    end: (event: PointerEvent<SVGSVGElement>) => {
      if (active.current?.pointerId !== event.pointerId) return;
      update(event);
      const gesture = active.current;
      cancel();
      const changed = (["x", "y", "width", "height"] as const).some(
        (key) => Math.abs(gesture.bounds[key] - gesture.original[key]) > 1e-8,
      );
      if (changed && gesture.moved)
        onCommit(gesture.original.id, gesture.bounds);
    },
    lost: (event: PointerEvent<SVGSVGElement>) => {
      if (active.current?.pointerId === event.pointerId) cancel();
    },
  };
}
