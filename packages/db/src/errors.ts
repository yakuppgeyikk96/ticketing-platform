// packages/db/src/errors.ts
import { DrizzleQueryError } from "drizzle-orm";

// PostgreSQL SQLSTATE for unique_violation.
const UNIQUE_VIOLATION = "23505";

/**
 * True if `err` is (or wraps) a PostgreSQL unique-constraint violation.
 * Pass `constraint` to match a specific index or constraint name.
 */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  // Drizzle wraps the driver error; the real one is in `cause`.
  const cause = err instanceof DrizzleQueryError ? err.cause : err;

  if (!cause || typeof cause !== "object") return false;
  if (!("code" in cause) || cause.code !== UNIQUE_VIOLATION) return false;

  if (constraint === undefined) return true;
  return "constraint" in cause && cause.constraint === constraint;
}

/**
 * Returns a copy of `err` that is safe to log.
 * Drizzle's error message embeds the query parameters (emails, password
 * hashes, ...). Keep the query text and the underlying driver error, drop
 * the parameters. Anything that is not a Drizzle error passes through.
 */
export function toLoggableError(err: unknown): unknown {
  if (!(err instanceof DrizzleQueryError)) return err;

  const safe = new Error(`Failed query: ${err.query}`, { cause: err.cause });
  safe.name = err.name;
  // Keep the original call site; only the first line (the message) changes.
  if (err.stack) {
    safe.stack = err.stack.replace(
      /^[\s\S]*?\n(?=\s+at )/,
      `${safe.name}: ${safe.message}\n`,
    );
  }
  return safe;
}
