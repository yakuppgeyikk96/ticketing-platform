import {
  useState,
  useRef,
  useImperativeHandle,
  type CSSProperties,
  type Ref,
  type KeyboardEvent,
} from "react";
import type { LayoutDocument, RectangleColor } from "../core/document.ts";
import { Scene, type SceneHandle } from "./Scene.tsx";
import { createDefaultRectangle } from "./newRectangle.ts";
import { useLayoutHistory, type HistoryState } from "./useLayoutHistory.ts";
import { useRectangleDrag } from "./useRectangleDrag.ts";
import { PositionPanel, type PositionPanelMessages } from "./PositionPanel.tsx";
import {
  CursorPosition,
  type CursorPositionHandle,
} from "./CursorPosition.tsx";
import "./editor.css";
import { LayerList } from "./LayerList.tsx";
import { EditorIcon } from "./EditorIcon.tsx";
import type { RectangleBounds } from "../core/geometry.ts";
import type { LayerAction } from "../core/operations.ts";
import type { DrawnRectangle } from "./useRectangleDraw.ts";

export interface LayoutEditorHandle {
  reorderRectangle: (id: string, action: LayerAction) => void;
  fitToScreen: () => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  addRectangle: () => void;
  setRectangleColor: (
    id: string,
    property: RectangleColor,
    color: string,
  ) => void;
  setRectangleLabel: (id: string, label: string) => void;
  rotateRectangle: (id: string, degrees: number) => void;
  undo: () => void;
  redo: () => void;
  moveRectangle: (id: string, position: { x: number; y: number }) => void;
  resizeRectangle: (
    id: string,
    size: { width: number; height: number },
  ) => void;
}

export interface LayoutEditorProps {
  /** Initialization only; remount with a new key to open another document. */
  initialDocument: LayoutDocument;
  label: string;
  onSelectionChange?: (id: string | null) => void;
  onDocumentChange?: (document: LayoutDocument) => void;
  onHistoryChange?: (state: HistoryState) => void;
  /** Supply localized messages to show the built-in position panel. */
  positionMessages?: PositionPanelMessages;
  fitToScreenLabel?: string;
  zoomLabel?: string;
  cursorLabel?: string;
  addRectangleLabel?: string;
  newRectangleLabel?: string;
  deleteLabel?: string;
  selectToolLabel?: string;
  drawRectangleLabel?: string;
  gridLabel?: string;
  ref?: Ref<LayoutEditorHandle>;
  className?: string;
  style?: CSSProperties;
}

export function LayoutEditor({
  initialDocument,
  label,
  onSelectionChange,
  onDocumentChange,
  onHistoryChange,
  positionMessages,
  fitToScreenLabel = "Fit to screen",
  zoomLabel = "Zoom",
  cursorLabel = "Pointer coordinates",
  addRectangleLabel = "Add rectangle",
  newRectangleLabel = "Rectangle",
  deleteLabel = "Delete",
  selectToolLabel = "Select",
  drawRectangleLabel = "Draw rectangle",
  gridLabel = "Grid",
  ref,
  className,
  style,
}: LayoutEditorProps) {
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<"select" | "rectangle">("select");
  const cursor = useRef<CursorPositionHandle>(null);
  const scene = useRef<SceneHandle>(null);
  function select(id: string | null) {
    if (selectedId === id) return;
    setSelectedId(id);
    onSelectionChange?.(id);
  }
  const history = useLayoutHistory(
    initialDocument,
    (document) => {
      if (
        selectedId &&
        !document.elements.some((element) => element.id === selectedId)
      )
        select(null);
      onDocumentChange?.(document);
    },
    onHistoryChange,
  );
  const drag = useRectangleDrag(history.document, select, history.move);
  function cancelInteractions() {
    drag.cancel();
    scene.current?.cancelGesture();
  }
  function selectLayer(id: string) {
    cancelInteractions();
    setTool("select");
    select(id);
  }
  function fitToScreen() {
    cancelInteractions();
    scene.current?.fit();
  }
  function add() {
    cancelInteractions();
    const center = scene.current?.getViewportCenter();
    if (!center) return;
    const id = crypto.randomUUID();
    history.add(createDefaultRectangle(id, center, newRectangleLabel));
    select(id);
    setTool("select");
  }
  function chooseTool(next: "select" | "rectangle") {
    cancelInteractions();
    setTool(next);
    scene.current?.focus();
  }
  function completeDrawing(bounds: DrawnRectangle) {
    const id = crypto.randomUUID();
    const rectangle = createDefaultRectangle(
      id,
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
      newRectangleLabel,
    );
    history.add({ ...rectangle, ...bounds });
    select(id);
    setTool("select");
  }
  function duplicateSelected() {
    if (!selectedId) return;
    cancelInteractions();
    const id = crypto.randomUUID();
    history.duplicate(selectedId, id);
    select(id);
    setTool("select");
    scene.current?.focus();
  }
  function deleteSelected() {
    if (!selectedId) return;
    cancelInteractions();
    history.remove(selectedId);
    // Keep keyboard navigation usable after the focused SVG element disappears.
    scene.current?.focus();
  }
  function move(id: string, position: { x: number; y: number }) {
    cancelInteractions();
    history.move(id, position);
  }
  function undo() {
    cancelInteractions();
    history.undo();
  }
  function resize(id: string, size: { width: number; height: number }) {
    cancelInteractions();
    history.resize(id, size);
  }
  function resizeBounds(id: string, bounds: RectangleBounds) {
    cancelInteractions();
    history.setBounds(id, bounds);
  }
  function rotate(id: string, degrees: number) {
    cancelInteractions();
    return history.rotate(id, degrees);
  }
  function setLabel(id: string, label: string) {
    cancelInteractions();
    history.setLabel(id, label);
  }
  function setColor(id: string, property: RectangleColor, color: string) {
    cancelInteractions();
    history.setColor(id, property, color);
  }
  function reorderLayer(id: string, index: number) {
    cancelInteractions();
    history.moveToIndex(id, index);
  }
  function reorder(id: string, action: LayerAction) {
    cancelInteractions();
    history.reorder(id, action);
  }
  function redo() {
    cancelInteractions();
    history.redo();
  }
  useImperativeHandle(ref, () => ({
    reorderRectangle: reorder,
    fitToScreen,
    addRectangle: add,
    duplicateSelected,
    deleteSelected,
    moveRectangle: move,
    resizeRectangle: resize,
    rotateRectangle: rotate,
    setRectangleLabel: setLabel,
    setRectangleColor: setColor,
    undo,
    redo,
  }));
  function key(event: KeyboardEvent<HTMLElement>) {
    const target = event.target;
    if (
      event.defaultPrevented ||
      event.nativeEvent.isComposing ||
      (target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable]"))
    )
      return;
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.shiftKey &&
      event.key.toLowerCase() === "d"
    ) {
      event.preventDefault();
      if (!event.repeat) duplicateSelected();
      return;
    }
    if (
      (event.key === "Delete" || event.key === "Backspace") &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      if (selectedId) {
        event.preventDefault();
        deleteSelected();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (scene.current?.cancelGesture() || tool === "rectangle") {
        setTool("select");
        return;
      }
      if (!drag.cancel()) select(null);
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    }
  }
  const selected = history.document.elements.find(
    (element) => element.id === selectedId,
  );
  return (
    <div
      className={["le-editor", className].filter(Boolean).join(" ")}
      style={style}
      onKeyDown={key}
    >
      <div className="le-editor__toolbar">
        <button
          type="button"
          aria-pressed={tool === "select"}
          onClick={() => chooseTool("select")}
        >
          <EditorIcon name="selection" />
          {selectToolLabel}
        </button>
        <button
          type="button"
          aria-pressed={tool === "rectangle"}
          onClick={() => chooseTool("rectangle")}
        >
          <EditorIcon name="draw" />
          {drawRectangleLabel}
        </button>
        <span className="le-editor__tool-divider" aria-hidden="true" />
        <button type="button" onClick={add}>
          <EditorIcon name="rectangle" />
          {addRectangleLabel}
        </button>
        <button type="button" disabled={!selected} onClick={deleteSelected}>
          <EditorIcon name="delete" />
          {deleteLabel}
        </button>
        <span className="le-editor__tool-divider" aria-hidden="true" />
        <button
          type="button"
          aria-pressed={showGrid}
          onClick={() => {
            cancelInteractions();
            setShowGrid((value) => !value);
          }}
        >
          {gridLabel}
        </button>
      </div>
      <div
        className="le-editor__body"
        data-has-panel={Boolean(positionMessages)}
      >
        <div className="le-editor__scene">
          <Scene
            tool={tool}
            showGrid={showGrid}
            onDraw={completeDrawing}
            onResizeBounds={resizeBounds}
            onRotate={rotate}
            onZoomChange={setZoom}
            ref={scene}
            document={history.document}
            label={label}
            selection={{ id: selectedId, select }}
            interaction={drag.interaction}
            onPointerPosition={(point) => cursor.current?.update(point)}
          />
        </div>
        {positionMessages && (
          <aside
            className="le-editor__inspector"
            aria-label={positionMessages.title}
          >
            <LayerList
              elements={history.document.elements}
              selectedId={selectedId}
              onSelect={selectLayer}
              onReorder={reorderLayer}
              title={positionMessages.layerList ?? "Layers"}
              emptyLabel={positionMessages.emptyLayers ?? "No elements yet."}
              unnamedLabel={positionMessages.unnamedElement ?? "Rectangle"}
            />
            {selected ? (
              <PositionPanel
                element={selected}
                messages={positionMessages}
                onDuplicate={duplicateSelected}
                layerOrder={{
                  index: history.document.elements.findIndex(
                    (element) => element.id === selected.id,
                  ),
                  count: history.document.elements.length,
                  onReorder: reorder,
                }}
                onMove={move}
                onResize={resize}
                onRotate={rotate}
                onLabelChange={setLabel}
                onColorChange={setColor}
              />
            ) : (
              <div className="le-editor__empty">
                <span className="le-editor__empty-icon">
                  <EditorIcon name="selection" />
                </span>
                <h2>{positionMessages.title}</h2>
                <p className="le-editor__hint">
                  {positionMessages.emptySelection ??
                    "Select an element to edit its properties."}
                </p>
              </div>
            )}
          </aside>
        )}
      </div>
      <div className="le-editor__status">
        <span>
          {history.document.width} × {history.document.height}
        </span>
        <button type="button" onClick={fitToScreen}>
          {fitToScreenLabel}
        </button>
        <span aria-label={zoomLabel}>{Math.round(zoom * 1000) / 10}%</span>
        <CursorPosition ref={cursor} label={cursorLabel} />
      </div>
    </div>
  );
}
