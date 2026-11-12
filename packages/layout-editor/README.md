# Layout editor

Independent document operations, a read-only React SVG preview, and a selectable
React SVG editor.

## Structure

- `src/core/`: document types, validation, serialization, immutable operations and
  history. No React or DOM dependencies.
- `src/react/`: TSX components and hooks connecting the core to SVG, pointer
  interaction, selection and the position panel.
- `demo/`: an example React application. It supplies sample data, localized text,
  history buttons and document-change callbacks; editing behavior stays in the
  library.

Import core functions from `@ticketing/layout-editor` and React components from
`@ticketing/layout-editor/react`. Core tests run with Node; React TSX tests use
Vitest.

The core exports `getRectangleCorner` for rotated world-space corner positions and
`resizeFromCorner` for corner-drag geometry. Resize calculations keep the opposite
corner fixed, preserve rotation, and return new x/y/width/height without mutation.
Crossing the anchor clamps to a configurable minimum size (default: two drawing
units) instead of flipping. The editor exposes corner handles with live previews, cancellation, and a single
undo entry per completed resize.

## Demo

The editor styles are scoped to `.le-editor`. Theme defaults can be overridden
on the editor class: `--le-surface`, `--le-workspace`, `--le-text`, `--le-muted`,
`--le-border`, `--le-accent`, `--le-input`, and `--le-danger`. Controls include
keyboard focus and disabled/error states; transitions respect reduced motion.
The optional `geometry` and `appearance` messages localize inspector groups.

The demo styles its application header, file actions, history controls and footer
separately. Keyboard help and JSON inspection are available without taking up the
main drawing area.

Run the standalone demo from the repository root:

```sh
pnpm --filter @ticketing/layout-editor dev
```

Open <http://127.0.0.1:5174>. The demo imports the real `LayoutEditor` component
and displays a validated example document; it does not require the dashboard,
API, or database. Edit `demo/example.ts` to change the drawing.

The demo's Open file and Export JSON actions load and download drawing documents.
Files are parsed and validated before replacing the current drawing; errors keep
the current document intact. A successful open remounts the editor, clearing
selection, viewport and undo/redo history. If the current drawing differs from
the last opened/exported snapshot, replacing it asks for confirmation. Unsaved
changes also enable the browser's leave-page warning. Export marks the snapshot
submitted for download; browser download completion cannot be verified by the app.
These browser file operations live in `demo/useDocumentFiles.ts`, outside the
library. No server storage is involved.

The toolbar's Add rectangle action inserts a 160 × 100 rectangle at the center of
the current viewport, including after panning. It generates a UUID, selects the
new rectangle, and commits one undoable change. `addRectangleLabel` and
`newRectangleLabel` localize the button and initial element label. Custom controls
can call `addRectangle()` through the editor ref. Undo removes the rectangle and
clears its selection; redo restores its original ID and properties.
The Select and Draw rectangle tool buttons switch between moving/panning and
drawing. In draw mode, drag anywhere on the scene to preview a rectangle; release
to commit one edit and select the new object. Drawing supports all directions
and panned coordinates. Escape cancels and returns to selection; pointer cancel
or lost capture discards the preview. Draws smaller than two document units on
either axis are ignored. A completed draw returns to selection mode.
`selectToolLabel` and `drawRectangleLabel` localize the tool buttons. Preview
frames do not change the document or add history entries.
During rectangle drawing, resizing, rotation or object dragging, the viewport automatically pans near
its edges and continues while the captured pointer is outside the frame. Speed
ramps within 40 CSS pixels of an edge and is capped at 480 CSS pixels/second per
axis. It begins only after actual pointer movement and never on idle hover or
manual panning. A stationary pointer is reprojected after each scroll so the
preview remains attached to it. Release, Escape, cancellation, lost capture, tab
hiding and window blur stop auto-pan. Auto-pan is view state; the completed draw
or move still creates only one document edit.
The Delete action is disabled without a selection. Delete or Backspace removes
the selected rectangle when the scene has focus; input fields and composing text
are excluded. Deletion clears selection, returns focus to the scene, and creates
one undo entry. Undo restores identity, geometry, styles and stacking order.
`deleteLabel` localizes the button; custom controls can call `deleteSelected()`
through the editor ref.

The demo fills the remaining viewport height. The interactive scene uses the full
container, initially at one drawing unit per CSS pixel; it does not letterbox the viewport to
the document's aspect ratio. Drag empty space to pan to off-screen content. The
dashed 1200 × 800 boundary marks the document, not the available workspace. Pan is
temporary view state, not an undoable edit; Escape cancels an active pan.
The read-only `LayoutPreview` still fits the complete document to its container.

The 240px properties inspector sits to the right of the scene and reserves its
space even without a selection. Below 640px container width it moves beneath the
scene and scrolls independently. X/Y and positive width/height fields commit on
Enter or blur, support Escape cancellation, and participate in undo/redo. The
rotation field accepts any finite angle and displays the normalized `[0, 360)`
value. Equivalent angles do not create another history entry. Rotation uses the
rectangle's center. Custom host controls can call `rotateRectangle(id, degrees)`
through the editor ref; the optional `rotation` message localizes the field label.
The label field follows the same Enter/blur and Escape behavior, accepts empty
text to hide a label, and supports undo/redo. Text is rendered as plain content,
never HTML. The optional `label` message localizes its name; custom host controls
can use `setRectangleLabel(id, label)` through the editor ref or core operation.
Fill, stroke, and text colors are editable through a native picker or six-digit
hex input. Changes commit on blur (Enter also blurs the text input); Escape
restores the committed value. Invalid hex values show an error without changing
the document. Each completed color edit supports undo/redo. The core and editor
ref expose `setRectangleColor(id, property, color)` for custom controls.
A pointer indicator in the bottom status bar shows document coordinates (not screen pixels), including while dragging
and beyond the document boundary; it shows dashes only when the pointer leaves
the viewport. `cursorLabel` supplies its accessible label.
Pointer updates rerender only the indicator and do not create document changes.

Click a rectangle to select it; click empty space or press Escape to clear the
selection. Tab focuses elements; Enter or Space selects them. Selection is reported
through `onSelectionChange` and does not change the document or undo history.
Drag a rectangle to move it. Intermediate positions update the SVG locally and
are not emitted as document changes. Pointer release commits one history entry;
Escape, pointer cancellation, and lost capture discard the preview. SVG screen
transforms convert pointer coordinates, including scaling and aspect-ratio offsets.

`onDocumentChange` receives completed changes, undo, and redo. `onHistoryChange`
reports `canUndo` and `canRedo`; a React ref exposes `undo()` and `redo()`. The demo
includes history buttons and live JSON. Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z redoes.
The editor's built-in position panel appears when `positionMessages` is provided.
The host supplies localized `title`, `hint`, and `invalidNumber` strings, with
optional `width`, `height`, `invalidSize`, and `emptySelection` messages; the panel
and editing behavior live in the library. The ref's `moveRectangle(id, { x, y })`
command remains available for custom host controls. Enter or blur commits a finite number as one
undo entry; Escape restores the committed field value. Empty and nonfinite input
shows an error without changing the document. Selection, dragging, and undo/redo
refresh the displayed coordinates. Unchanged values do not create history entries.
`initialDocument` is initialization-only; remount with a new key to open another
document. `LayoutPreview` remains read-only. Changes are local and are not saved to
the server.

The labeled areas are decorative rectangles, not ticketing sections. JSON is
available below the preview for inspection.

```sh
pnpm --filter @ticketing/layout-editor typecheck
pnpm --filter @ticketing/layout-editor test
pnpm --filter @ticketing/layout-editor build:demo
```

Selected shapes have a circular rotation handle above their top edge. Drag it to
rotate around the shape center, including across the 0/360-degree boundary.
Movement previews do not change document history; release commits one edit.
Escape, pointer cancellation or lost capture restores the original angle. The
handle follows resizing and rotation, and edge panning remains available during
the gesture. The inspector rotation field remains the keyboard alternative.

Wheel or trackpad scrolling over the scene zooms around the pointer. Wheel zoom
normally ranges from 1% to 800%; fitting unusually large plans may go below 1%.
The footer shows the current percentage and a localized Fit to screen button
(`fitToScreenLabel`, `zoomLabel`). The editor ref also exposes `fitToScreen()`.
Fit includes the document boundary and rotated artwork outside it, with padding.
Zoom and fit are viewport state: they never change documents, dirty state or
undo history. Wheel zoom is ignored during an active edit or pan; fit cancels an
active gesture before changing the view. Pan and edge-pan retain CSS-pixel speed
at every zoom level. Selection handles retain their screen size. The host must
provide a container with nonzero height; resizing it preserves the zoom level.

The inspector offers Bring forward, Send backward, Bring to front and Send to
back controls for the selected rectangle. Array order is paint order; no separate
z-index is stored. Reordering preserves selection, IDs, geometry and styling,
commits one undoable edit and is included in JSON exports. Controls are disabled
at their ordering boundary; no-op actions preserve history and pending redo.
The optional `layers`, `bringForward`, `sendBackward`, `bringToFront` and
`sendToBack` inspector messages localize these controls. Custom host controls can
call `reorderRectangle(id, action)` on the editor ref. React-free consumers can
use the core operation of the same name with `forward`, `backward`, `front` or
`back` as the action.

The built-in inspector shows a scrollable Layers list above the properties.
Elements are listed front-to-back without changing document order. Native buttons
support pointer selection and Tab/Enter/Space; the selected row exposes
`aria-pressed` and follows scene selection. Choosing a layer cancels any active
gesture, returns to the Select tool and updates the same selection used by the
scene and inspector, without a history entry. Reordering, label/color edits,
creation, deletion and undo/redo update the list from the current document.
Whitespace-only labels use a localized rectangle label plus the stable element
ID. `layerList`, `emptyLayers` and `unnamedElement` in `positionMessages` localize
the heading, empty state and fallback name. Long labels truncate visually while
the full text remains available to assistive technology and in the tooltip.

Drag a row in the Layers list above or below another row to reorder it. An accent
line marks the insertion edge; the source row becomes selected and remains
selected after the drop. Reordering commits only on drop as one undoable edit;
dropping at the existing position is a no-op and preserves pending redo.
Escape or dropping outside the list leaves document order unchanged. Drags from
another editor or external source are ignored. The inspector's four ordering
buttons remain the keyboard and touch alternative; native HTML drag-and-drop is
intended for desktop pointers. The core also exposes `moveRectangleToIndex`,
which accepts a final zero-based paint-order index (last means front).

The selected rectangle can be duplicated from the inspector's Duplicate button
(`positionMessages.duplicate`) or Ctrl/Cmd+D while focus is inside the editor.
Editable fields and IME composition keep their native keyboard behavior; holding
the shortcut does not generate repeated copies. The copy keeps the original
label, dimensions, rotation and colors, receives a new UUID and is offset by
24 document units on each axis. It is appended in front, selected and the scene
receives focus. Duplication is a single undoable edit; redo restores the same ID.
The ref exposes `duplicateSelected()`. The React-free `duplicateRectangle` core
operation accepts the source ID, a caller-supplied new ID and an optional offset.

The Grid toolbar toggle is initially off; `gridLabel` localizes it. It only
shows/hides grid lines and does not enable snapping. Grid lines cover the document
boundary and follow the document origin through pan/zoom; when zoomed out, only
coarser lines are shown to avoid a dense pattern. Visibility is local view state
and does not dirty the document or enter history.

Hold Alt/Option while drawing, moving a shape or resizing for temporary 10-unit
grid snapping, independent of grid visibility. Moving first aligns nearby edges/centers, falling back to snapping the rectangle's
unrotated x/y anchor on unmatched axes, including negative positions; a click without dragging
leaves an off-grid shape unchanged. Releasing Alt restores free movement from
the original pointer offset. Panning empty space remains free viewport movement.
Numeric fields and rotation are unchanged.
Drawing snaps both original endpoints; releasing Alt restores the free preview
without losing the original coordinates. Cardinal-angle rectangles snap the
dragged world corner while keeping the opposite corner fixed; off-grid fixed
corners remain unchanged, and the positive minimum size takes precedence over
snapping near that corner. At other angles, width/height snap to positive
10-unit multiples along the rectangle's own axes, preserving rotation and the
fixed corner. This does not guarantee a world-grid intersection for rotated
corners. Key press/release updates an active preview even without pointer
movement, and edge-pan reprojects with the current modifier. Escape still cancels,
and a completed gesture still adds at most one history entry.

During an Alt/Option move, each axis independently prefers the nearest other
shape's left/center/right or top/center/bottom alignment within 6 CSS pixels of
raw pointer geometry. Tolerance accounts for SVG zoom and host CSS scaling.
Without an alignment match, that axis falls back to the 10-unit grid. The moving
shape is excluded from targets. Rotated shapes use axis-aligned bounds of their
rotated corners, excluding decorative stroke. Up to two dashed accent guides
connect the aligned bounds. Guides update with edge-pan and modifier changes,
and disappear when Alt is released or the gesture completes/cancels. They remain
transient SVG state, outside documents and history. The aligned final move is
one undoable edit; drawing and resizing retain their existing grid behavior.
