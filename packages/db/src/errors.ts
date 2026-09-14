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
