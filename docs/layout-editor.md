# Layout editor

Status: initial design. The interfaces below describe the first implementation;
they are not yet a published compatibility guarantee.

## Purpose and boundary

Build a reusable React 2D layout editor in `packages/layout-editor`, initially
consumed by the organizer dashboard. Keep document types, editing operations,
rendering, and React integration in separate modules inside this package. The
document and editing operations must not depend on React or a rendering library.

Implementation structure: `src/core/` contains the React-free model and operations;
`src/react/` contains TSX components and interaction/history hooks. `demo/App.tsx`
is a host application, not part of the editing implementation. The built-in X/Y
position panel belongs to the React layer and receives localized messages from
the host through `positionMessages`. Core tests run directly in Node; Vitest
transforms the React TSX tests.

The editor owns geometry, selection, transforms, pan/zoom, and undo/redo. The host
owns authentication, persistence, permissions, layout lifecycle, pricing, capacity,
and reservations. No imports from ticketing contracts, database, dashboard, or API
packages are allowed in the editor. React will be a peer dependency when packaged
for distribution. Public types must not expose renderer-specific objects.

## First complete workflow

Open a valid document, add a labeled rectangle, select it, move, resize, rotate,
and delete it. Undo and redo completed actions. Export JSON and reload it with the
same element identities, geometry, styles, and stacking order. Support read-only
viewing, basic pan/zoom, and keyboard operation through an element list and numeric
property fields as well as pointer controls.

Selected rectangles expose four corner resize handles. Resizing keeps the opposite
corner fixed in document coordinates, including rotated shapes; crossing it clamps
the dimensions instead of flipping. Pointer movement updates only the active SVG
element and controls, and release commits a single undoable bounds change. Escape
or lost pointer capture restores the original geometry. Edge panning also works
while resizing. Numeric property fields remain the keyboard alternative.

Start with one selected element at a time. Multi-selection, groups, snapping,
polygons, free text elements, image uploads, sections, seats, collaboration, and
automatic saving are later additions. Rectangle labels are plain text. The first
editor does not imply any ticket inventory.

## Document format

Use a JSON document with an explicit format version. Example:

```json
{
  "formatVersion": 1,
  "width": 1200,
  "height": 800,
  "elements": [
    {
      "id": "d36900fc-8673-49be-a16e-ab0f44e2d189",
      "type": "rectangle",
      "x": 100,
      "y": 50,
      "width": 400,
      "height": 100,
      "rotation": 0,
      "label": "Stage",
      "style": {
        "fill": "#444444",
        "stroke": "#222222",
        "strokeWidth": 1,
        "textColor": "#ffffff"
      }
    }
  ]
}
```

- Document coordinates start at the top-left; x grows right and y grows down.
  Units are logical drawing units, independent of CSS pixels, device pixel ratio,
  and physical measurements.
- Element x/y identify the unrotated top-left corner. Positive rotation is
  clockwise in degrees around the rectangle's center; serialize normalized values
  in `[0, 360)`. Width and height are positive; resizing commits dimensions rather
  than renderer scale factors. Fractional element coordinates are allowed.
- Elements later in the array render above earlier elements. Do not also store a
  competing `zIndex`. IDs are stable across edits and saves; duplicates receive new
  IDs. The host persists them without replacement.
- Document dimensions are positive integers matching the current layout version
  API. Element coordinates must be finite; dimensions must be positive and stroke
  width nonnegative. Validate colors and accept plain text labels, not executable
  markup or arbitrary renderer configuration.
- In the first release, elements may extend beyond the document boundary; preview
  content is clipped to that boundary, while editor controls can remain visible.
- Selection, hover, active tool, drag previews, viewport transforms, and history
  are session state and are not serialized. A saved preview image is a derivative,
  never the editable source.
- Reject unsupported format versions, duplicate IDs, malformed elements, and
  unregistered element types before loading. Do not silently drop unknown data.
  Add explicit document migrations when the format changes.

## React interface and state ownership

Proposed public surface:

```tsx
<LayoutEditor
  initialDocument={document}
  readOnly={!canEdit}
  onDocumentChange={handleDocumentChange}
  messages={editorMessages}
/>
```

The editor owns its live document and history after initialization. During a drag,
it updates a transient preview without emitting full document snapshots to the
host. Pointer release commits one edit and one undo entry. Pointer cancellation or
Escape discards the preview. Adding, deleting, or applying property changes also
creates one completed edit. Undo/redo emit document changes, but pan/zoom and
selection do not.

`onDocumentChange` receives the committed document, including undo/redo results.
The host retains the latest committed snapshot for an explicit Save action. Never
mutate an object already delivered to the host. Read-only mode prevents all
document-changing commands, including keyboard commands, while allowing navigation
and inspection. Server-side draft checks remain mandatory.

`initialDocument` is initialization-only, not a controlled prop. Switching layout
versions remounts the editor with a version-specific React key. Refetching the same
version must not replace unsaved work. Explicit reload and conflict-resolution
flows must warn before discarding edits. The host owns dirty-state and navigation
warnings; leaving during an unfinished gesture cancels it.

Localize built-in UI through a messages interface supplied by the host. The editor
must not depend on the dashboard's i18next instance or global CSS. Scope its styles
and expose documented CSS variables for theming.

## Extensibility

First ship the rectangle workflow with an internal element registry. Before
publishing a custom-element API, implement a second element type to validate the
boundary. A definition needs a stable type identifier, payload validation,
geometry/bounds operations, rendering, and property editing. Renderer-dependent
drawing stays behind adapters rather than leaking into the document.

Ticketing-specific section and seat tools will use this boundary. Their business
IDs and data must be validated by the host; the editor never decides capacity,
price, availability, or sale eligibility. Do not keep independently editable
geometry in both a JSON document and relational tables: choose the authoritative
representation and update any projections transactionally when those models arrive.

## Persistence and versions

Keep three separate concepts:

| Value                    | Owner          | Meaning                                |
| ------------------------ | -------------- | -------------------------------------- |
| `formatVersion`          | Editor package | JSON interpretation                    |
| Layout version ID/number | Host           | Draft/published plan identity          |
| Edit revision            | Host           | Optimistic concurrency token for saves |

The host saves a complete document and its expected edit revision initially. The
server validates the document, checks draft status, and updates document plus
revision atomically. Conflicting saves return a conflict instead of overwriting.
Published and archived versions remain read-only. A save response for an older
snapshot must not mark newer local changes as saved.

The version's existing width/height initialize the first document. If dimensions
also live in persisted JSON, validate equality and update both atomically; do not
allow conflicting values. Exact storage and save endpoints will be decided after
the document prototype, before dashboard saving is implemented. Existing layout
versions without drawing data open an empty document at their stored dimensions.

## Rendering and performance gate

Decision: use SVG for the initial editor. In the user's Chrome run with 10,000
rectangles, labels off, DPR 2, and a 1464 × 538 viewport, both renderers reported
a p95 frame interval of 9 ms. JS submission was 0.10 ms for SVG and 1.70 ms for
Canvas; these are not total paint costs. This baseline supports starting with SVG,
not a guarantee for all scenes or devices. Revisit if realistic interaction traces
show a bottleneck. No Canvas production adapter is planned now.

The package exposes a read-only `LayoutPreview` from `@ticketing/layout-editor/react`.
It accepts a validated document and an accessible label, renders geometry and labels
in array order, and supports host styling through `className` and `style`. The root
entry stays React-free. Label fitting and editing controls are later steps.

The standalone comparison prototype remains available for further measurements.
Do not implement multiple production renderers merely for abstraction.

Benchmark 100, 1,000, and 10,000 seat-like elements, plus labels and decorative
shapes. Measure loading, pan/zoom, selection, dragging, serialization, and memory
on a recorded desktop and mobile/browser profile. Target interaction frames within
roughly 16.7 ms on the chosen desktop baseline; record actual results and long
tasks rather than claiming an element-count guarantee. Put evidence in `labs/`.

Keep the rendered bitmap viewport-sized if using Canvas. Coalesce pointer work
with animation frames, separate static content from active interaction, avoid
whole-page React updates for drag previews, and reduce labels when zoomed out.
Introduce viewport culling or spatial indexing when measurements justify it.
Every event listener and animation frame must be cleaned up on unmount.

## Implementation order

1. Scaffold the package with document types, validation, and JSON round-trip tests.
2. Implement pure editing operations and bounded undo/redo; verify one gesture
   produces one history entry and a new edit clears redo history.
3. Compare renderer prototypes and record the performance decision.
4. Complete the rectangle interaction workflow and accessible property controls.
5. Embed it in the version page, with read-only behavior and explicit persistence,
   edit revision checks, and unsaved-change handling.
6. Extend with visual elements, then sections and seats, preserving the separation
   between drawing and ticketing behavior.
