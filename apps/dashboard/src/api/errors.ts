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
