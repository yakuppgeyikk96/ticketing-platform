import type { CSSProperties } from "react";
import type { LayoutDocument } from "../core/document.ts";
import { Scene } from "./Scene.tsx";

export interface LayoutPreviewProps {
  /** Supply a validated document; validation belongs to the host. */
  document: LayoutDocument;
  /** Accessible description in the host application's language. */
  label: string;
  className?: string;
  style?: CSSProperties;
}

export function LayoutPreview(props: LayoutPreviewProps) {
  return <Scene {...props} />;
}
