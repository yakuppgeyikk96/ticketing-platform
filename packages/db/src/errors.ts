// packages/db/src/errors.ts
import { DrizzleQueryError } from "drizzle-orm";

// PostgreSQL SQLSTATE codes (class 23: integrity constraint violation).
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * True if `err` is (or wraps) a PostgreSQL constraint violation with the given
 * SQLSTATE. Pass `constraint` to match a specific index or constraint name.
 */
function isViolation(
  code: string,
  err: unknown,
  constraint: string | undefined,
): boolean {
  // Drizzle wraps the driver error; the real one is in `cause`.
  const cause = err instanceof DrizzleQueryError ? err.cause : err;

  if (!cause || typeof cause !== "object") return false;
  if (!("code" in cause) || cause.code !== code) return false;

  if (constraint === undefined) return true;
  return "constraint" in cause && cause.constraint === constraint;
}

/** Unique index or constraint violated; `constraint` narrows to one name. */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  return isViolation(UNIQUE_VIOLATION, err, constraint);
}

/**
 * Foreign key violated: the referenced row does not exist, or (composite
 * keys) exists under another tenant. Raised by INSERT/UPDATE on the child,
 * and by DELETE on a parent still referenced.
 */
export function isForeignKeyViolation(
  err: unknown,
  constraint?: string,
): boolean {
  return isViolation(FOREIGN_KEY_VIOLATION, err, constraint);
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
