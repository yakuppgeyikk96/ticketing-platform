import { useRef, useEffect, type PointerEvent } from "react";
import type { LayoutDocument, RectangleElement } from "../core/document.ts";
import type { SceneInteraction } from "./Scene.tsx";
import { useAltSnap } from "./useAltSnap.ts";
import {
  alignDraggedRectangle,
  rectangleAlignmentBounds,
  type AlignmentBounds,
  type AlignmentGuide,
} from "./alignment.ts";
import { paintAlignmentGuides } from "./alignmentPreview.ts";
import { clientToDocument } from "./coordinates.ts";

export function useRectangleDrag(
  document: LayoutDocument,
  select: (id: string | null) => void,
  onMove: (id: string, position: { x: number; y: number }) => void,
) {
  const drag = useRef<{
    id: string;
    original: RectangleElement;
    targets: AlignmentBounds[];
    guides: AlignmentGuide[];
    pointerId: number;
    node: SVGGElement;
    svg: SVGSVGElement;
    start: { x: number; y: number };
    origin: { x: number; y: number };
    preview: { x: number; y: number };
    transform: string;
    clientX: number;
    clientY: number;
    startClientX: number;
    startClientY: number;
    moved: boolean;
    snap: boolean;
  } | null>(null);
  const frame = useRef<number | null>(null);
  function resetPreview() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const active = drag.current;
    drag.current = null;
    if (!active) return;
    paintAlignmentGuides(active.svg, []);
    active.node.setAttribute("transform", active.transform);
    active.svg
      .querySelector("[data-selection-controls]")
      ?.removeAttribute("transform");
    if (active.node.hasPointerCapture(active.pointerId))
      active.node.releasePointerCapture(active.pointerId);
  }
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      drag.current = null;
    },
    [],
  );
  function point(
    svg: SVGSVGElement,
    event: Pick<PointerEvent, "clientX" | "clientY">,
  ) {
    return clientToDocument(svg, event.clientX, event.clientY);
  }
  function updateDrag(
    event: Pick<PointerEvent, "clientX" | "clientY" | "pointerId"> & {
      altKey?: boolean;
    },
  ) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (event.altKey !== undefined) active.snap = event.altKey;
    active.clientX = event.clientX;
    active.clientY = event.clientY;
    active.moved ||=
      Math.hypot(
        event.clientX - active.startClientX,
        event.clientY - active.startClientY,
      ) >= 0.5;
    if (!active.moved) return;
    const current = point(active.svg, event);
    if (!current) return;
    active.preview = {
      x: active.origin.x + current.x - active.start.x,
      y: active.origin.y + current.y - active.start.y,
    };
    active.guides = [];
    if (active.snap) {
      const matrix = active.svg.getScreenCTM();
      const scaleX = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
      const scaleY = matrix ? Math.hypot(matrix.c, matrix.d) : 1;
      const aligned = alignDraggedRectangle(
        active.original,
        active.preview,
        active.targets,
        { x: 6 / (scaleX || 1), y: 6 / (scaleY || 1) },
      );
      active.preview = aligned.position;
      active.guides = aligned.guides;
    }
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (drag.current !== active) return;
      const transform = `translate(${active.preview.x - active.origin.x} ${active.preview.y - active.origin.y}) ${active.transform}`;
      paintAlignmentGuides(active.svg, active.guides);
      active.node.setAttribute("transform", transform);
      active.svg
        .querySelector("[data-selection-controls]")
        ?.setAttribute(
          "transform",
          `translate(${active.preview.x - active.origin.x} ${active.preview.y - active.origin.y})`,
        );
    });
  }
  useAltSnap((pressed) => {
    const active = drag.current;
    if (!active) return false;
    active.snap = pressed;
    updateDrag({
      pointerId: active.pointerId,
      clientX: active.clientX,
      clientY: active.clientY,
    });
    return true;
  });
  const interaction: SceneInteraction = {
    isActive: () => drag.current !== null,
    reproject: () => {
      const active = drag.current;
      if (active)
        updateDrag({
          pointerId: active.pointerId,
          clientX: active.clientX,
          clientY: active.clientY,
        });
    },
    start: (id, event) => {
      if (event.button !== 0 || drag.current) return;
      const svg = event.currentTarget.ownerSVGElement;
      if (!svg) return;
      const start = point(svg, event);
      const element = document.elements.find((item) => item.id === id);
      if (!start || !element) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.focus();
      select(id);
      const origin = { x: element.x, y: element.y };
      drag.current = {
        id,
        original: element,
        targets: document.elements
          .filter((item) => item.id !== id)
          .map(rectangleAlignmentBounds),
        guides: [],
        pointerId: event.pointerId,
        node: event.currentTarget,
        svg,
        start,
        origin,
        preview: origin,
        transform: event.currentTarget.getAttribute("transform") ?? "",
        clientX: event.clientX,
        clientY: event.clientY,
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
        snap: event.altKey,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    move: updateDrag,
    end: (event) => {
      if (drag.current?.pointerId !== event.pointerId) return;
      updateDrag(event);
      const active = drag.current;
      resetPreview();
      onMove(active.id, active.preview);
    },
    cancel: (event) => {
      if (drag.current?.pointerId === event.pointerId) resetPreview();
    },
  };
  function cancel() {
    if (!drag.current) return false;
    resetPreview();
    return true;
  }
  return { interaction, cancel };
}
