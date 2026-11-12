import type { LayoutDocument } from "./document.ts";
import {
  validateDocument,
  type DocumentValidationIssue,
} from "./validation.ts";

function validationError(issues: DocumentValidationIssue[]): Error {
  const details = issues
    .map(({ path, message }) => `${path.join(".") || "document"}: ${message}`)
    .join("; ");
  return new Error(`Invalid layout document: ${details}`);
}

export function parseDocument(json: string): LayoutDocument {
  const parsedDoc: unknown = JSON.parse(json);
  const validationResult = validateDocument(parsedDoc);

  if (!validationResult.success) {
    throw validationError(validationResult.issues);
  }

  return validationResult.document;
}

export function serializeDocument(document: LayoutDocument): string {
  const validationResult = validateDocument(document);

  if (!validationResult.success) {
    throw validationError(validationResult.issues);
  }

  return JSON.stringify(validationResult.document);
}
