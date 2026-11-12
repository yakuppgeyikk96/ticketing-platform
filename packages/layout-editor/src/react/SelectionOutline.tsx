import type { RectangleElement } from "../core/document.ts";
import { rectangleTransform } from "./Rectangle.tsx";
import type { PointerEvent } from "react";
import { getRectangleCorner, type ResizeCorner } from "../core/geometry.ts";
import { rotationHandleTransform } from "./rotation.ts";
import { resizeCursor } from "./resizePreview.ts";

export function SelectionOutline({
  element,
  controlScale = 1,
  onResizeStart,
  onRotateStart,
}: {
  element: RectangleElement;
  controlScale?: number;
  onRotateStart?: (id: string, event: PointerEvent<SVGGElement>) => void;
  onResizeStart?: (
    id: string,
    corner: ResizeCorner,
    event: PointerEvent<SVGGElement>,
  ) => void;
}) {
  return (
    <g
      data-selection-controls
      data-control-scale={controlScale}
      aria-hidden="true"
    >
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        transform={rectangleTransform(element)}
        fill="none"
        stroke="var(--le-accent, #4f46e5)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        aria-hidden="true"
        data-selection-outline
      />
      {onRotateStart && (
        <g
          data-rotation-handle
          transform={`${rotationHandleTransform(element)}${controlScale === 1 ? "" : ` scale(${controlScale})`}`}
          style={{ cursor: "grab" }}
          onPointerDown={(event) => onRotateStart(element.id, event)}
          onClick={(event) => event.stopPropagation()}
        >
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={-28}
            stroke="var(--le-accent, #4f46e5)"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
          <circle cx={0} cy={-28} r={12} fill="transparent" />
          <circle
            cx={0}
            cy={-28}
            r={5}
            fill="white"
            stroke="var(--le-accent, #4f46e5)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}
      {onResizeStart &&
        (["nw", "ne", "se", "sw"] as const).map((corner) => {
          const point = getRectangleCorner(element, corner);
          return (
            <g
              key={corner}
              data-resize-corner={corner}
              transform={`translate(${point.x} ${point.y})${controlScale === 1 ? "" : ` scale(${controlScale})`}`}
              style={{ cursor: resizeCursor(element.rotation, corner) }}
              onPointerDown={(event) =>
                onResizeStart(element.id, corner, event)
              }
              onClick={(event) => event.stopPropagation()}
            >
              <rect x={-10} y={-10} width={20} height={20} fill="transparent" />
              <rect
                x={-4}
                y={-4}
                width={8}
                height={8}
                rx={1}
                fill="white"
                stroke="var(--le-accent, #4f46e5)"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
    </g>
  );
}
