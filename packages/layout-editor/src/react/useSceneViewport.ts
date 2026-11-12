import {
  useEffect,
  useRef,
  useCallback,
  type PointerEvent,
  type RefObject,
} from "react";

import { zoomAt, fitViewport, wheelZoomFactor } from "./viewport.ts";

/** Viewport state is local to the renderer and never enters document history. */
export function useSceneViewport(
  ref: RefObject<SVGSVGElement | null>,
  enabled: boolean,
  onZoomChange?: (zoom: number) => void,
  canZoom?: () => boolean,
  onWheelPosition?: (x: number, y: number) => void,
) {
  const zoom = useRef(1);
  const offset = useRef({ x: 0, y: 0 });
  const size = useRef({ width: 1, height: 1 });
  const pan = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    origin: { x: number; y: number };
  } | null>(null);

  const paint = useCallback(() => {
    ref.current?.setAttribute(
      "viewBox",
      `${offset.current.x} ${offset.current.y} ${size.current.width / zoom.current} ${size.current.height / zoom.current}`,
    );
    onZoomChange?.(zoom.current);
  }, [ref, onZoomChange]);
  useEffect(() => {
    const svg = ref.current;
    if (!enabled || !svg) return;
    const resize = () => {
      // Preserve zoom when the host container changes size.
      size.current = {
        width: Math.max(1, svg.clientWidth),
        height: Math.max(1, svg.clientHeight),
      };
      paint();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(svg);
    return () => {
      observer.disconnect();
      pan.current = null;
    };
  }, [enabled, ref, paint]);

  useEffect(() => {
    const svg = ref.current;
    if (!enabled || !svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (pan.current || canZoom?.() === false) return;
      const bounds = svg.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const next = zoomAt(
        { ...offset.current, zoom: zoom.current },
        {
          x:
            ((event.clientX - bounds.left) * size.current.width) / bounds.width,
          y:
            ((event.clientY - bounds.top) * size.current.height) /
            bounds.height,
        },
        zoom.current *
          wheelZoomFactor(event.deltaY, event.deltaMode, size.current.height),
      );
      offset.current = { x: next.x, y: next.y };
      zoom.current = next.zoom;
      paint();
      onWheelPosition?.(event.clientX, event.clientY);
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, [enabled, ref, paint, canZoom, onWheelPosition]);

  function move(event: PointerEvent<SVGSVGElement>) {
    const active = pan.current;
    if (!active || active.pointerId !== event.pointerId) return;
    // getBoundingClientRect also accounts for CSS scaling of the host container.
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    offset.current = {
      x:
        active.origin.x -
        ((event.clientX - active.clientX) * size.current.width) /
          zoom.current /
          bounds.width,
      y:
        active.origin.y -
        ((event.clientY - active.clientY) * size.current.height) /
          zoom.current /
          bounds.height,
    };
    paint();
  }
  function finish(commit: boolean) {
    const active = pan.current;
    if (!active) return false;
    pan.current = null;
    if (!commit) {
      offset.current = active.origin;
      paint();
    }
    const svg = ref.current;
    if (svg?.hasPointerCapture(active.pointerId))
      svg.releasePointerCapture(active.pointerId);
    if (svg) svg.style.cursor = "grab";
    return true;
  }
  return {
    fit: (document: {
      width: number;
      height: number;
      x?: number;
      y?: number;
    }) => {
      finish(false);
      const next = fitViewport(size.current, document);
      offset.current = { x: next.x, y: next.y };
      zoom.current = next.zoom;
      paint();
    },
    panBy: (x: number, y: number) => {
      const bounds = ref.current?.getBoundingClientRect();
      if (!bounds?.width || !bounds.height) return;
      offset.current = {
        x:
          offset.current.x +
          (x * size.current.width) / zoom.current / bounds.width,
        y:
          offset.current.y +
          (y * size.current.height) / zoom.current / bounds.height,
      };
      paint();
    },
    isPanning: () => pan.current !== null,
    start: (event: PointerEvent<SVGSVGElement>) => {
      if (
        !enabled ||
        pan.current ||
        event.button !== 0 ||
        event.target !== event.currentTarget
      )
        return;
      event.preventDefault();
      event.currentTarget.focus();
      pan.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        origin: { ...offset.current },
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.style.cursor = "grabbing";
    },
    move,
    end: (event: PointerEvent<SVGSVGElement>) => {
      if (pan.current?.pointerId !== event.pointerId) return;
      move(event);
      finish(true);
    },
    cancel: (event: PointerEvent<SVGSVGElement>) => {
      if (pan.current?.pointerId === event.pointerId) finish(false);
    },
    escape: () => finish(false),
  };
}
