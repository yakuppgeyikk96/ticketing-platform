import {
  useRef,
  useId,
  useState,
  useCallback,
  useImperativeHandle,
  type Ref,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { LayoutDocument } from "../core/document.ts";
import { Rectangle } from "./Rectangle.tsx";
import { SelectionOutline } from "./SelectionOutline.tsx";
import { clientToDocument } from "./coordinates.ts";
import { useSceneViewport } from "./useSceneViewport.ts";
import { useRectangleDraw, type DrawnRectangle } from "./useRectangleDraw.ts";
import type { RectangleBounds } from "../core/geometry.ts";
import { useRectangleRotate } from "./useRectangleRotate.ts";
import { useRectangleResize } from "./useRectangleResize.ts";
import { visibleGridSpacing } from "./grid.ts";
import { documentViewportBounds } from "./viewport.ts";
import { useEdgePan } from "./useEdgePan.ts";

export interface SceneInteraction {
  isActive: () => boolean;
  reproject: () => void;
  start: (id: string, event: PointerEvent<SVGGElement>) => void;
  move: (event: PointerEvent<SVGSVGElement>) => void;
  end: (event: PointerEvent<SVGSVGElement>) => void;
  cancel: (event: PointerEvent<SVGSVGElement>) => void;
}

export interface SceneHandle {
  cancelGesture: () => boolean;
  fit: () => void;
  focus: () => void;
  getViewportCenter: () => { x: number; y: number } | null;
}

interface Props {
  ref?: Ref<SceneHandle>;
  document: LayoutDocument;
  label: string;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  selection?: { id: string | null; select: (id: string | null) => void };
  interaction?: SceneInteraction;
  onKeyDown?: (event: KeyboardEvent<SVGSVGElement>) => void;
  onPointerPosition?: (point: { x: number; y: number } | null) => void;
  showGrid?: boolean;
  tool?: "select" | "rectangle";
  onZoomChange?: (zoom: number) => void;
  onRotate?: (id: string, degrees: number) => void;
  onResizeBounds?: (id: string, bounds: RectangleBounds) => void;
  onDraw?: (bounds: DrawnRectangle) => void;
}

export function Scene({
  ref,
  document,
  label,
  className,
  style,
  selection,
  interaction,
  onKeyDown,
  onPointerPosition,
  tool = "select",
  showGrid = false,
  onDraw,
  onResizeBounds,
  onRotate,
  onZoomChange,
}: Props) {
  const gridId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const previewRef = useRef<SVGRectElement>(null);
  const drawing = useRectangleDraw(svgRef, previewRef, (bounds) =>
    onDraw?.(bounds),
  );
  const resizing = useRectangleResize(document, (id, bounds) =>
    onResizeBounds?.(id, bounds),
  );
  const rotating = useRectangleRotate(document, (id, degrees) =>
    onRotate?.(id, degrees),
  );
  const [zoom, setZoom] = useState(1);
  const reportZoom = useCallback(
    (value: number) => {
      setZoom(value);
      onZoomChange?.(value);
    },
    [onZoomChange],
  );
  const viewport = useSceneViewport(
    svgRef,
    Boolean(interaction),
    reportZoom,
    () =>
      !drawing.isActive() &&
      !resizing.isActive() &&
      !rotating.isActive() &&
      !interaction?.isActive(),
    (x, y) => {
      const svg = svgRef.current;
      if (svg) onPointerPosition?.(clientToDocument(svg, x, y));
    },
  );
  const edgePan = useEdgePan(
    svgRef,
    () =>
      drawing.isActive() ||
      resizing.isActive() ||
      rotating.isActive() ||
      Boolean(interaction?.isActive()),
    viewport.panBy,
    (x, y) => {
      drawing.reproject();
      resizing.reproject();
      rotating.reproject();
      interaction?.reproject();
      const svg = svgRef.current;
      if (svg) onPointerPosition?.(clientToDocument(svg, x, y));
    },
  );
  useImperativeHandle(ref, () => ({
    cancelGesture: () => {
      edgePan.stop();
      const drew = drawing.cancel();
      const resized = resizing.cancel();
      const rotated = rotating.cancel();
      return drew || resized || rotated;
    },
    fit: () => viewport.fit(documentViewportBounds(document)),
    focus: () => svgRef.current?.focus(),
    getViewportCenter: () => {
      const svg = svgRef.current;
      if (!svg) return null;
      const bounds = svg.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return null;
      return clientToDocument(
        svg,
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      );
    },
  }));
  const selected = selection
    ? document.elements.find((element) => element.id === selection.id)
    : undefined;
  return (
    <svg
      ref={svgRef}
      role={selection ? "group" : "img"}
      aria-label={label}
      viewBox={
        interaction ? undefined : `0 0 ${document.width} ${document.height}`
      }
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      className={className}
      style={{
        display: "block",
        overflow: "hidden",
        ...(interaction
          ? {
              touchAction: "none",
              cursor: tool === "rectangle" ? "crosshair" : "grab",
              background: "var(--le-workspace, #f1f3f7)",
            }
          : {}),
        ...style,
      }}
      xmlns="http://www.w3.org/2000/svg"
      tabIndex={selection ? 0 : undefined}
      onPointerDown={(event) => {
        if (tool === "rectangle") drawing.start(event);
        else viewport.start(event);
        if (event.target === event.currentTarget) selection?.select(null);
      }}
      onPointerDownCapture={(event) => {
        drawing.clearClick();
        resizing.clearClick();
        rotating.clearClick();
        edgePan.start(event);
      }}
      onClickCapture={(event) => {
        const drew = drawing.consumeClick();
        const resized = resizing.consumeClick();
        const rotated = rotating.consumeClick();
        if (drew || resized || rotated) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onPointerMove={(event) => {
        if (tool === "rectangle") drawing.move(event);
        else if (rotating.isActive()) rotating.move(event);
        else if (resizing.isActive()) resizing.move(event);
        else if (viewport.isPanning()) viewport.move(event);
        else interaction?.move(event);
        edgePan.track(event);
        if (!onPointerPosition) return;
        const point = clientToDocument(
          event.currentTarget,
          event.clientX,
          event.clientY,
        );
        onPointerPosition(point);
      }}
      onPointerLeave={() => onPointerPosition?.(null)}
      onPointerUp={(event) => {
        edgePan.stop(event.pointerId);
        if (tool === "rectangle") drawing.end(event);
        else if (rotating.isActive()) rotating.end(event);
        else if (resizing.isActive()) resizing.end(event);
        else if (viewport.isPanning()) viewport.end(event);
        else interaction?.end(event);
      }}
      onPointerCancel={(event) => {
        edgePan.stop(event.pointerId);
        drawing.lost(event);
        resizing.lost(event);
        rotating.lost(event);
        viewport.cancel(event);
        interaction?.cancel(event);
      }}
      onLostPointerCapture={(event) => {
        edgePan.stop(event.pointerId);
        drawing.lost(event);
        resizing.lost(event);
        rotating.lost(event);
        viewport.cancel(event);
        interaction?.cancel(event);
      }}
      onClick={
        selection && tool === "select"
          ? () => selection.select(null)
          : undefined
      }
      onKeyDown={(event) => {
        if (event.key === "Escape") edgePan.stop();
        if (event.key === "Escape" && viewport.escape()) {
          event.preventDefault();
          return;
        }
        onKeyDown?.(event);
      }}
    >
      {interaction && (
        <rect
          x={0}
          y={0}
          width={document.width}
          height={document.height}
          fill="white"
          stroke="#cbd5e1"
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
          aria-hidden="true"
        />
      )}
      {interaction && showGrid && (
        <>
          <defs>
            <pattern
              id={gridId}
              width={visibleGridSpacing(zoom)}
              height={visibleGridSpacing(zoom)}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${visibleGridSpacing(zoom)} 0 H 0 V ${visibleGridSpacing(zoom)}`}
                fill="none"
                stroke="var(--le-border, #cbd5e1)"
                strokeWidth={1 / zoom}
              />
            </pattern>
          </defs>
          <rect
            x={0}
            y={0}
            width={document.width}
            height={document.height}
            fill={`url(#${gridId})`}
            pointerEvents="none"
            aria-hidden="true"
            data-editor-grid
          />
        </>
      )}
      {document.elements.map((element) => (
        <Rectangle
          key={element.id}
          element={element}
          {...(selection && tool === "select"
            ? {
                selected: selection.id === element.id,
                onSelect: selection.select,
              }
            : {})}
          {...(interaction && tool === "select"
            ? { onPointerDown: interaction.start }
            : {})}
        />
      ))}
      {selected && (
        <SelectionOutline
          element={selected}
          controlScale={1 / zoom}
          {...(interaction && tool === "select"
            ? { onResizeStart: resizing.start, onRotateStart: rotating.start }
            : {})}
        />
      )}
      {interaction && (
        <g pointerEvents="none" aria-hidden="true">
          {[0, 1].map((index) => (
            <line
              key={index}
              data-alignment-guide
              display="none"
              stroke="var(--le-accent, #4f46e5)"
              strokeWidth={1}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}
      {interaction && (
        <rect
          ref={previewRef}
          x={0}
          y={0}
          width={0}
          height={0}
          fill="var(--le-accent, #4f46e5)"
          fillOpacity={0.12}
          stroke="var(--le-accent, #4f46e5)"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
          aria-hidden="true"
          display="none"
        />
      )}
    </svg>
  );
}
