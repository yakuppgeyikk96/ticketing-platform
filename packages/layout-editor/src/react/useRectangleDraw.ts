import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
import { useAltSnap } from "./useAltSnap.ts";
import { clientToDocument } from "./coordinates.ts";
import { rectangleBounds, type Point } from "./drawRectangle.ts";

export type DrawnRectangle = NonNullable<ReturnType<typeof rectangleBounds>>;

export function useRectangleDraw(
  svg: RefObject<SVGSVGElement | null>,
  preview: RefObject<SVGRectElement | null>,
  onComplete: (bounds: DrawnRectangle) => void,
) {
  const active = useRef<{
    snap: boolean;
    pointerId: number;
    start: Point;
    end: Point;
    clientX: number;
    clientY: number;
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
  function paint() {
    if (!active.current || !preview.current) return;
    const bounds = rectangleBounds(
      active.current.start,
      active.current.end,
      active.current.snap,
    );
    preview.current.setAttribute("display", bounds ? "inline" : "none");
    if (bounds)
      for (const [key, value] of Object.entries(bounds))
        preview.current.setAttribute(key, String(value));
  }
  function update(
    event: Pick<PointerEvent, "clientX" | "clientY" | "pointerId"> & {
      altKey?: boolean;
    },
  ) {
    if (!active.current || active.current.pointerId !== event.pointerId) return;
    const node = svg.current;
    if (!node) return;
    if (event.altKey !== undefined) active.current.snap = event.altKey;
    active.current.clientX = event.clientX;
    active.current.clientY = event.clientY;
    const point = clientToDocument(node, event.clientX, event.clientY);
    if (!point) return;
    active.current.end = point;
    if (frame.current === null)
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        paint();
      });
  }
  useAltSnap((pressed) => {
    if (!active.current) return false;
    active.current.snap = pressed;
    paint();
    return true;
  });
  function cancel() {
    const gesture = active.current;
    if (!gesture) return false;
    active.current = null;
    skipClick.current = true;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    preview.current?.setAttribute("display", "none");
    if (svg.current?.hasPointerCapture(gesture.pointerId))
      svg.current.releasePointerCapture(gesture.pointerId);
    return true;
  }
  return {
    isActive: () => active.current !== null,
    reproject: () => {
      const gesture = active.current;
      if (gesture)
        update({
          pointerId: gesture.pointerId,
          clientX: gesture.clientX,
          clientY: gesture.clientY,
        });
    },
    cancel,
    clearClick: () => {
      skipClick.current = false;
    },
    consumeClick: () => {
      const skip = skipClick.current;
      skipClick.current = false;
      return skip;
    },
    start: (event: PointerEvent<SVGSVGElement>) => {
      if (active.current || event.button !== 0) return;
      const point = clientToDocument(
        event.currentTarget,
        event.clientX,
        event.clientY,
      );
      if (!point) return;
      event.preventDefault();
      event.currentTarget.focus();
      active.current = {
        pointerId: event.pointerId,
        snap: event.altKey,
        start: point,
        end: point,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    move: update,
    end: (event: PointerEvent<SVGSVGElement>) => {
      if (!active.current || active.current.pointerId !== event.pointerId)
        return;
      update(event);
      const bounds = rectangleBounds(
        active.current.start,
        active.current.end,
        active.current.snap,
      );
      cancel();
      if (bounds) onComplete(bounds);
    },
    lost: (event: PointerEvent<SVGSVGElement>) => {
      if (active.current?.pointerId === event.pointerId) cancel();
    },
  };
}
