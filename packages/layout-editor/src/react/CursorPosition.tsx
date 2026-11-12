import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";

export interface CursorPositionHandle {
  update: (point: { x: number; y: number } | null) => void;
}

/** Pointer updates rerender this small indicator, not the scene or its elements. */
export function CursorPosition({
  ref,
  label,
}: {
  ref: Ref<CursorPositionHandle>;
  label: string;
}) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const latest = useRef(point);
  const frame = useRef<number | null>(null);
  useImperativeHandle(ref, () => ({
    update: (next) => {
      latest.current = next;
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setPoint(latest.current);
      });
    },
  }));
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return (
    <span aria-label={label} className="le-editor__coordinates">
      X: {point ? point.x.toFixed(1) : "—"} · Y:{" "}
      {point ? point.y.toFixed(1) : "—"}
    </span>
  );
}
