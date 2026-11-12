import { useState, type DragEvent } from "react";
import { layerDropIndex, type LayerDropEdge } from "./layerDrop.ts";
import type { LayoutElement } from "../core/document.ts";

interface Props {
  elements: readonly LayoutElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (id: string, index: number) => void;
  title: string;
  emptyLabel: string;
  unnamedLabel: string;
}

/** Paint order is reversed for display only; selection never changes the document. */
export function LayerList({
  elements,
  selectedId,
  onSelect,
  onReorder,
  title,
  emptyLabel,
  unnamedLabel,
}: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; edge: LayerDropEdge } | null>(
    null,
  );
  function reset() {
    setDraggedId(null);
    setDrop(null);
  }
  function target(event: DragEvent<HTMLLIElement>, id: string) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      id,
      edge:
        event.clientY < bounds.top + bounds.height / 2
          ? ("above" as const)
          : ("below" as const),
    };
  }
  return (
    <section className="le-editor__layer-list" aria-label={title}>
      <p className="le-editor__section-title">{title}</p>
      {elements.length === 0 ? (
        <p className="le-editor__hint">{emptyLabel}</p>
      ) : (
        <ul
          onDragLeave={(event) => {
            if (
              !(event.relatedTarget instanceof Node) ||
              !event.currentTarget.contains(event.relatedTarget)
            )
              setDrop(null);
          }}
          onDragEnd={reset}
        >
          {[...elements].reverse().map((element) => {
            const label = element.label.trim()
              ? element.label
              : `${unnamedLabel} (${element.id})`;
            return (
              <li
                key={element.id}
                data-drop-edge={drop?.id === element.id ? drop.edge : undefined}
                onDragOver={(event) => {
                  if (!draggedId) return;
                  if (draggedId === element.id) {
                    setDrop(null);
                    return;
                  }
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  const next = target(event, element.id);
                  setDrop((previous) =>
                    previous?.id === next.id && previous.edge === next.edge
                      ? previous
                      : next,
                  );
                }}
                onDrop={(event) => {
                  if (!draggedId) return;
                  event.preventDefault();
                  const next = target(event, element.id);
                  const index = layerDropIndex(
                    elements,
                    draggedId,
                    element.id,
                    next.edge,
                  );
                  const source = draggedId;
                  reset();
                  if (index !== null) onReorder(source, index);
                }}
              >
                <button
                  type="button"
                  draggable={elements.length > 1}
                  data-dragging={draggedId === element.id || undefined}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", element.id);
                    setDraggedId(element.id);
                    setDrop(null);
                    onSelect(element.id);
                  }}
                  aria-pressed={selectedId === element.id}
                  title={label}
                  onClick={() => onSelect(element.id)}
                >
                  <span
                    className="le-editor__layer-swatch"
                    style={{ backgroundColor: element.style.fill }}
                    aria-hidden="true"
                  />
                  <span className="le-editor__layer-name">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
