/** Velocity in CSS pixels/second, ramped inside a 40px edge band and capped outside. */
export function edgePanVelocity(
  point: { x: number; y: number },
  bounds: { left: number; top: number; width: number; height: number },
) {
  function axis(value: number, start: number, length: number) {
    if (!Number.isFinite(value) || length <= 0) return 0;
    const band = Math.min(40, length / 2);
    if (value < start + band)
      return -480 * Math.min(1, (start + band - value) / band);
    if (value > start + length - band)
      return 480 * Math.min(1, (value - start - length + band) / band);
    return 0;
  }
  return {
    x: axis(point.x, bounds.left, bounds.width),
    y: axis(point.y, bounds.top, bounds.height),
  };
}
