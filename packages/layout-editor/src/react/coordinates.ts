interface ScreenTransformSource {
  getScreenCTM(): {
    inverse(): {
      a: number;
      b: number;
      c: number;
      d: number;
      e: number;
      f: number;
    };
  } | null;
}

/** Includes SVG scale and the offsets introduced by preserveAspectRatio. */
export function clientToDocument(
  svg: ScreenTransformSource,
  clientX: number,
  clientY: number,
) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const inverse = matrix.inverse();
  const x = inverse.a * clientX + inverse.c * clientY + inverse.e;
  const y = inverse.b * clientX + inverse.d * clientY + inverse.f;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
