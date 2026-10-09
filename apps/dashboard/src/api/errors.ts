import { ApiError } from "./client.ts";

// One place turns a failure into words. A screen may override the message for
// problem types it knows (keyed by problem.type, never by message text);
// everything else falls back to the server's title, then to a network message.
export function describeError(
  err: unknown,
  messages: Record<string, string> = {},
): string {
  if (err instanceof ApiError) {
    return messages[err.problem.type] ?? err.problem.title;
  }
  return "Sunucuya ulaşılamadı, tekrar dene";
}

// Server-side validation comes back as problem.errors[{ field, message }].
// Keyed by field name so a form can place each message under its input.
// Field names match the API body fields, so no mapping is needed today.
export function fieldErrors(err: unknown): Record<string, string> {
  if (err instanceof ApiError && err.problem.type === "/problems/validation") {
    return Object.fromEntries(
      (err.problem.errors ?? []).map((e) => [e.field, e.message]),
    );
  }
  return {};
}

// True when the failure is not attributable to any single field, so the form
// should show it as a whole.
export function isFormLevelError(err: unknown): boolean {
  return Object.keys(fieldErrors(err)).length === 0;
}
