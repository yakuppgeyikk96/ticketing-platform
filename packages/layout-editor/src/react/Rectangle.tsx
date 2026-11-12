import type { KeyboardEvent, PointerEvent } from "react";
import type { RectangleElement } from "../core/document.ts";

export function rectangleTransform(element: RectangleElement): string {
  return `rotate(${element.rotation} ${element.x + element.width / 2} ${element.y + element.height / 2})`;
}

interface Props {
  element: RectangleElement;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onPointerDown?: (id: string, event: PointerEvent<SVGGElement>) => void;
}

export function Rectangle({
  element,
  selected,
  onSelect,
  onPointerDown,
}: Props) {
  function selectWithKeyboard(event: KeyboardEvent<SVGGElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(element.id);
  }
  return (
    <g
      data-element-id={element.id}
      transform={rectangleTransform(element)}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={onSelect ? element.label || element.id : undefined}
      aria-pressed={onSelect ? selected : undefined}
      style={onSelect ? { cursor: "pointer" } : undefined}
      onPointerDown={
        onPointerDown ? (event) => onPointerDown(element.id, event) : undefined
      }
      onClick={
        onSelect
          ? (event) => {
              event.stopPropagation();
              event.currentTarget.focus();
              onSelect(element.id);
            }
          : undefined
      }
      onKeyDown={onSelect ? selectWithKeyboard : undefined}
    >
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={element.style.fill}
        stroke={element.style.stroke}
        strokeWidth={element.style.strokeWidth}
      />
      {element.label && (
        <text
          x={element.x + element.width / 2}
          y={element.y + element.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="sans-serif"
          fontSize={14}
          fill={element.style.textColor}
          pointerEvents="none"
        >
          {element.label}
        </text>
      )}
    </g>
  );
}
