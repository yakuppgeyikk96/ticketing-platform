import { useRef, useEffect, type PointerEvent } from "react";
import type { LayoutDocument, RectangleElement } from "../core/document.ts";
import type { DocumentPoint } from "../core/geometry.ts";
import { rotationDelta } from "./rotation.ts";
import { clientToDocument } from "./coordinates.ts";
import { paintResize } from "./resizePreview.ts";

export function useRectangleRotate(
  document: LayoutDocument,
  onCommit: (id: string, degrees: number) => void,
) {
  const active = useRef<{
    original: RectangleElement;
    degrees: number;
    previous: DocumentPoint;
    center: DocumentPoint;
    pointerId: number;
    clientX: number;
    clientY: number;
    moved: boolean;
    startX: number;
    startY: number;
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
    event: Pick<PointerEvent, "pointerId" | "clientX" | "clientY">,
  ) {
    const gesture = active.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
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
    gesture.degrees += rotationDelta(gesture.center, gesture.previous, point);
    if (
      Math.hypot(point.x - gesture.center.x, point.y - gesture.center.y) >= 1e-6
    )
      gesture.previous = point;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (active.current !== gesture) return;
      paintResize(gesture.node, gesture.controls, {
        ...gesture.original,
        rotation: gesture.degrees,
      });
    });
  }
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
    start: (id: string, event: PointerEvent<SVGGElement>) => {
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
      active.current = {
        original,
        previous: point,
        center: {
          x: original.x + original.width / 2,
          y: original.y + original.height / 2,
        },
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        moved: false,
        startX: event.clientX,
        startY: event.clientY,
        svg,
        node,
        controls: svg.querySelector<SVGGElement>("[data-selection-controls]"),
        handle: event.currentTarget,
        degrees: original.rotation,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    move: update,
    end: (event: PointerEvent<SVGSVGElement>) => {
      if (active.current?.pointerId !== event.pointerId) return;
      update(event);
      const gesture = active.current;
      cancel();
      const degrees = ((gesture.degrees % 360) + 360) % 360;
      const delta = Math.abs(degrees - gesture.original.rotation);
      if (gesture.moved && Math.min(delta, 360 - delta) > 1e-8)
        onCommit(gesture.original.id, degrees);
    },
    lost: (event: PointerEvent<SVGSVGElement>) => {
      if (active.current?.pointerId === event.pointerId) cancel();
    },
  };
}
