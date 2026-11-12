// Initial validation implementation written by OpenAI Codex.
import type { LayoutDocument } from "./document.ts";

export interface DocumentValidationIssue {
  path: (string | number)[];
  message: string;
}

export type DocumentValidationResult =
  | { success: true; document: LayoutDocument }
  | { success: false; issues: DocumentValidationIssue[] };

/** Checks already-decoded data. JSON parsing and persistence belong to callers. */
export function validateDocument(value: unknown): DocumentValidationResult {
  const issues: DocumentValidationIssue[] = [];
  type Path = DocumentValidationIssue["path"];
  function issue(path: Path, message: string) {
    issues.push({ path, message });
  }
  function object(
    input: unknown,
    path: Path,
  ): input is Record<string, unknown> {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      issue(path, "Expected an object");
      return false;
    }
    const prototype: unknown = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      issue(path, "Expected a plain object");
      return false;
    }
    return true;
  }
  function keys(input: Record<string, unknown>, allowed: string[], path: Path) {
    for (const key of Object.keys(input)) {
      if (!allowed.includes(key)) issue([...path, key], "Unknown field");
    }
  }
  function number(
    input: unknown,
    path: Path,
    min: number,
    exclusive = false,
    integer = false,
  ) {
    if (
      typeof input !== "number" ||
      !Number.isFinite(input) ||
      (exclusive ? input <= min : input < min) ||
      (integer && !Number.isSafeInteger(input))
    ) {
      issue(
        path,
        `Expected a finite ${integer ? "safe integer" : "number"} ${exclusive ? ">" : ">="} ${min}`,
      );
    }
  }
  if (!object(value, [])) return { success: false, issues };
  keys(value, ["formatVersion", "width", "height", "elements"], []);
  if (value.formatVersion !== 1)
    issue(["formatVersion"], "Unsupported document format version");
  number(value.width, ["width"], 0, true, true);
  number(value.height, ["height"], 0, true, true);
  if (!Array.isArray(value.elements)) {
    issue(["elements"], "Expected an array");
  } else {
    const ids = new Set<string>();
    // Index iteration also rejects holes in arrays supplied by JavaScript callers.
    for (let i = 0; i < value.elements.length; i++) {
      const element: unknown = value.elements[i];
      const path: Path = ["elements", i];
      if (!object(element, path)) continue;
      keys(
        element,
        [
          "id",
          "type",
          "x",
          "y",
          "width",
          "height",
          "rotation",
          "label",
          "style",
        ],
        path,
      );
      if (typeof element.id !== "string" || !element.id.trim()) {
        issue([...path, "id"], "Expected a nonempty ID");
      } else if (ids.has(element.id)) {
        issue([...path, "id"], "Duplicate element ID");
      } else ids.add(element.id);
      if (element.type !== "rectangle")
        issue([...path, "type"], "Unsupported element type");
      for (const key of ["x", "y"] as const) {
        if (
          typeof element[key] !== "number" ||
          !Number.isFinite(element[key])
        ) {
          issue([...path, key], "Expected a finite number");
        }
      }
      number(element.width, [...path, "width"], 0, true);
      number(element.height, [...path, "height"], 0, true);
      number(element.rotation, [...path, "rotation"], 0);
      if (typeof element.rotation === "number" && element.rotation >= 360) {
        issue([...path, "rotation"], "Rotation must be less than 360");
      }
      if (typeof element.label !== "string")
        issue([...path, "label"], "Expected plain text");
      if (object(element.style, [...path, "style"])) {
        keys(
          element.style,
          ["fill", "stroke", "strokeWidth", "textColor"],
          [...path, "style"],
        );
        for (const key of ["fill", "stroke", "textColor"] as const) {
          const color = element.style[key];
          if (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) {
            issue([...path, "style", key], "Expected a six-digit hex color");
          }
        }
        number(element.style.strokeWidth, [...path, "style", "strokeWidth"], 0);
      }
    }
  }
  if (issues.length) return { success: false, issues };
  // Every field of the document has been checked above; return it without mutation.
  return { success: true, document: value as unknown as LayoutDocument };
}
