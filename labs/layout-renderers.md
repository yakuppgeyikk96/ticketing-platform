# Layout renderer comparison

Status: initial user-supplied browser measurements collected; SVG selected for the
first implementation.

## Initial measurement

Chrome 157 on macOS, 10,000 rectangles, labels off, DPR 2, viewport 1464 × 538:

| Renderer | p95 frame interval | p95 JS submission |
| -------- | ------------------ | ----------------- |
| SVG      | 9.00 ms            | 0.10 ms           |
| Canvas   | 9.00 ms            | 1.70 ms           |

These are single runs supplied as screenshots, without hardware details, memory
profiles, or paint traces. They support an initial SVG implementation but do not
establish an overall performance ranking. Labels-on and mobile results remain open.

Open `packages/layout-editor/rendering-prototype.html` directly in a browser. It is
a standalone synthetic rendering experiment with no dependencies or server. It
does not implement the editor component or its document persistence.

Click a rectangle to select it; the selection is highlighted and its committed
coordinates appear below the preview. Dragging a rectangle uses a temporary
preview and commits on pointer release. Escape, pointer cancellation, or lost
capture restores its previous position. Empty-space dragging pans. Arrow keys
move the selected rectangle by one document unit (Shift: ten). Both renderers use
the same reverse-order linear hit test; overlapping objects select the topmost.
Switching renderer, count, or label settings rebuilds the synthetic scene and
discards edits. This page does not exercise the package's history or persistence.

Compare SVG and Canvas with 100, 1,000, and 10,000 rectangles, with labels both off
and on. Both renderers use the same logical coordinates and pan/zoom transform.
Canvas uses viewport-sized backing storage adjusted for device pixel ratio; SVG
uses retained rectangles and updates the parent transform. Neither renderer uses
viewport culling. This is a baseline, not an assertion of equivalent browser work.

Run the 120-frame pan benchmark with the tab visible. Record browser version,
hardware, viewport, device pixel ratio, element count, labels, and repeated-run
results. The page reports p95 frame intervals and JavaScript draw submission time.
Submission time excludes later browser paint/compositing and must not be compared
as if it were total rendering cost. Capture DevTools performance and memory traces
for that analysis. Initial scene timing also excludes paint completion.

Selection and single-element dragging are now available for manual comparison.
SVG updates only the selected node's transform; Canvas redraws the scene. Compare
these interactions in DevTools as well as the automated pan benchmark. Before
choosing the production renderer, add realistic section shapes and document
serialization measurements. Repeat on a mobile browser. SVG is selected for the
initial implementation; revisit with evidence if needed.
