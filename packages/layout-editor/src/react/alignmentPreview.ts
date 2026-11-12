import type { AlignmentGuide } from "./alignment.ts";

/** Reuse two SVG lines; pointer previews do not render the document through React. */
export function paintAlignmentGuides(
  svg: SVGSVGElement,
  guides: readonly AlignmentGuide[],
) {
  const nodes = svg.querySelectorAll<SVGLineElement>("[data-alignment-guide]");
  nodes.forEach((node, index) => {
    const guide = guides[index];
    node.setAttribute("display", guide ? "inline" : "none");
    if (guide)
      for (const key of ["x1", "y1", "x2", "y2"] as const)
        node.setAttribute(key, String(guide[key]));
  });
}
