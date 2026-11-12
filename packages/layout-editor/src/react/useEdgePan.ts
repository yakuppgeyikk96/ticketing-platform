import { useEffect, useRef, type RefObject, type PointerEvent } from "react";
import { edgePanVelocity } from "./edgePan.ts";

export function useEdgePan(
  svg: RefObject<SVGSVGElement | null>,
  isEditing: () => boolean,
  pan: (x: number, y: number) => void,
  refresh: (clientX: number, clientY: number) => void,
) {
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  const frame = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  function stop(pointerId?: number) {
    if (pointerId !== undefined && pointer.current?.id !== pointerId) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    pointer.current = null;
    lastTime.current = null;
  }
  useEffect(() => {
    const stopOnBlur = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      pointer.current = null;
      lastTime.current = null;
    };
    const stopWhenHidden = () => {
      if (window.document.hidden) stopOnBlur();
    };
    window.addEventListener("blur", stopOnBlur);
    window.document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      stopOnBlur();
      window.removeEventListener("blur", stopOnBlur);
      window.document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, []);
  function tick(time: number) {
    frame.current = null;
    const current = pointer.current,
      node = svg.current;
    if (!current || !node || !isEditing()) {
      stop();
      return;
    }
    const delta =
      lastTime.current === null
        ? 0
        : Math.min(40, Math.max(0, time - lastTime.current)) / 1000;
    lastTime.current = time;
    const speed = edgePanVelocity(current, node.getBoundingClientRect());
    if (speed.x || speed.y) {
      pan(speed.x * delta, speed.y * delta);
      // Reproject the stationary pointer after scrolling, not only on pointermove.
      refresh(current.x, current.y);
    }
    frame.current = requestAnimationFrame(tick);
  }
  return {
    start: (event: PointerEvent<SVGSVGElement>) => {
      if (event.button !== 0 || pointer.current) return;
      pointer.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    track: (event: PointerEvent<SVGSVGElement>) => {
      const current = pointer.current;
      if (!current || current.id !== event.pointerId) return;
      current.x = event.clientX;
      current.y = event.clientY;
      if (
        frame.current === null &&
        isEditing() &&
        Math.hypot(current.x - current.startX, current.y - current.startY) >= 3
      )
        frame.current = requestAnimationFrame(tick);
    },
    stop,
  };
}
