import { useId, useState, type FocusEvent } from "react";
import type { RectangleElement, RectangleColor } from "../core/document.ts";
import type { LayerAction } from "../core/operations.ts";
import { parseFieldNumber } from "./numberField.ts";
import { LabelField } from "./LabelField.tsx";
import { ColorField } from "./ColorField.tsx";

export interface PositionPanelMessages {
  title: string;
  hint: string;
  invalidNumber: string;
  invalidSize?: string;
  emptySelection?: string;
  width?: string;
  height?: string;
  rotation?: string;
  label?: string;
  fill?: string;
  stroke?: string;
  textColor?: string;
  invalidColor?: string;
  colorPicker?: string;
  geometry?: string;
  appearance?: string;
  duplicate?: string;
  layers?: string;
  layerList?: string;
  emptyLayers?: string;
  unnamedElement?: string;
  bringForward?: string;
  sendBackward?: string;
  bringToFront?: string;
  sendToBack?: string;
}

interface FieldProps {
  axis: "x" | "y" | "width" | "height" | "rotation";
  label: string;
  value: number;
  invalidNumber: string;
  onCommit: (value: number) => number | void;
}

function PositionField({
  axis,
  label,
  value,
  invalidNumber,
  onCommit,
}: FieldProps) {
  const id = useId();
  const [error, setError] = useState(false);
  function commit(event: FocusEvent<HTMLInputElement>) {
    const next = parseFieldNumber(
      event.currentTarget.value,
      axis === "width" || axis === "height",
    );
    if (next === null) {
      setError(true);
      return;
    }
    setError(false);
    if (next !== value) {
      const committed = onCommit(next);
      // Canonical angles must display even when normalization creates no edit.
      if (typeof committed === "number")
        event.currentTarget.value = String(committed);
    }
  }
  return (
    <div className="le-editor__field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        defaultValue={String(value)}
        aria-invalid={error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.value = String(value);
            setError(false);
            event.currentTarget.blur();
          }
        }}
      />
      {error && (
        <p className="le-editor__error" id={`${id}-error`} role="alert">
          {invalidNumber}
        </p>
      )}
    </div>
  );
}

export function PositionPanel({
  element,
  messages,
  onMove,
  onResize,
  onRotate,
  onLabelChange,
  onColorChange,
  layerOrder,
  onDuplicate,
}: {
  onDuplicate?: () => void;
  layerOrder?: {
    index: number;
    count: number;
    onReorder: (id: string, action: LayerAction) => void;
  };
  element: RectangleElement;
  messages: PositionPanelMessages;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onResize: (id: string, size: { width: number; height: number }) => void;
  onRotate: (id: string, degrees: number) => number;
  onLabelChange: (id: string, label: string) => void;
  onColorChange: (id: string, property: RectangleColor, color: string) => void;
}) {
  return (
    <div role="group" aria-label={messages.title}>
      <p className="le-editor__section-title">{messages.title}</p>
      <h2 className="le-editor__element-name">{element.label || element.id}</h2>
      <p className="le-editor__hint">{messages.hint}</p>
      {onDuplicate && (
        <button
          className="le-editor__duplicate"
          type="button"
          onClick={onDuplicate}
        >
          {messages.duplicate ?? "Duplicate"}
        </button>
      )}
      <div className="le-editor__fields">
        <LabelField
          key={`${element.id}:label:${element.label}`}
          label={messages.label ?? "Label"}
          value={element.label}
          onCommit={(value) => onLabelChange(element.id, value)}
        />
        <p className="le-editor__section-label">
          {messages.geometry ?? "Geometry"}
        </p>
        {(["x", "y"] as const).map((axis) => (
          <PositionField
            key={`${element.id}:${axis}:${element[axis]}`}
            axis={axis}
            label={axis.toUpperCase()}
            value={element[axis]}
            invalidNumber={messages.invalidNumber}
            onCommit={(value) =>
              onMove(element.id, { x: element.x, y: element.y, [axis]: value })
            }
          />
        ))}
        {(["width", "height"] as const).map((axis) => (
          <PositionField
            key={`${element.id}:${axis}:${element[axis]}`}
            axis={axis}
            label={messages[axis] ?? (axis === "width" ? "Width" : "Height")}
            value={element[axis]}
            invalidNumber={messages.invalidSize ?? messages.invalidNumber}
            onCommit={(value) =>
              onResize(element.id, {
                width: element.width,
                height: element.height,
                [axis]: value,
              })
            }
          />
        ))}
        <PositionField
          key={`${element.id}:rotation:${element.rotation}`}
          axis="rotation"
          label={messages.rotation ?? "Rotation (°)"}
          value={element.rotation}
          invalidNumber={messages.invalidNumber}
          onCommit={(value) => onRotate(element.id, value)}
        />
        <p className="le-editor__section-label">
          {messages.appearance ?? "Appearance"}
        </p>
        {(["fill", "stroke", "textColor"] as const).map((property) => (
          <ColorField
            key={`${element.id}:${property}:${element.style[property]}`}
            label={
              messages[property] ??
              { fill: "Fill", stroke: "Stroke", textColor: "Text color" }[
                property
              ]
            }
            pickerLabel={messages.colorPicker ?? "Color picker"}
            value={element.style[property]}
            invalidColor={
              messages.invalidColor ??
              "Enter a six-digit hex color, such as #2563eb."
            }
            onCommit={(color) => onColorChange(element.id, property, color)}
          />
        ))}
        {layerOrder && (
          <div
            className="le-editor__layers"
            role="group"
            aria-label={messages.layers ?? "Layer order"}
          >
            <p className="le-editor__section-label">
              {messages.layers ?? "Layer order"}
            </p>
            {(
              [
                ["forward", messages.bringForward ?? "Bring forward"],
                ["backward", messages.sendBackward ?? "Send backward"],
                ["front", messages.bringToFront ?? "Bring to front"],
                ["back", messages.sendToBack ?? "Send to back"],
              ] as const
            ).map(([action, label]) => (
              <button
                key={action}
                type="button"
                disabled={
                  action === "front" || action === "forward"
                    ? layerOrder.index >= layerOrder.count - 1
                    : layerOrder.index <= 0
                }
                onClick={() => layerOrder.onReorder(element.id, action)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
