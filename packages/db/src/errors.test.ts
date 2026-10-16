import assert from "node:assert/strict";
import { test } from "node:test";
import { DrizzleQueryError } from "drizzle-orm";
import {
  isForeignKeyViolation,
  isUniqueViolation,
  toLoggableError,
} from "./errors.ts";

// Shape of the error node-postgres raises; only the fields we read.
function pgError(code: string, constraint: string) {
  return Object.assign(new Error("violation"), { code, constraint });
}

test("isUniqueViolation and isForeignKeyViolation read the SQLSTATE", () => {
  const unique = pgError("23505", "venues_organization_id_slug_key");
  const fk = pgError("23503", "occurrences_venue_fk");

  assert.ok(isUniqueViolation(unique));
  assert.ok(!isUniqueViolation(fk));
  assert.ok(isForeignKeyViolation(fk));
  assert.ok(!isForeignKeyViolation(unique));
});

test("constraint name narrows the match", () => {
  const fk = pgError("23503", "occurrences_venue_fk");

  assert.ok(isForeignKeyViolation(fk, "occurrences_venue_fk"));
  assert.ok(!isForeignKeyViolation(fk, "occurrences_event_fk"));
});

test("violations are found inside a drizzle wrapper", () => {
  const wrapped = new DrizzleQueryError(
    "insert",
    [],
    pgError("23503", "occurrences_venue_fk"),
  );

  assert.ok(isForeignKeyViolation(wrapped, "occurrences_venue_fk"));
});

test("non-errors and errors without a code are not violations", () => {
  assert.ok(!isForeignKeyViolation(null));
  assert.ok(!isForeignKeyViolation("23503"));
  assert.ok(!isUniqueViolation(new Error("plain")));
});

test("toLoggableError strips query params from drizzle errors", () => {
  const original = new DrizzleQueryError(
    "select $1",
    ["secret-value"],
    new Error("boom"),
  );

  const safe = toLoggableError(original);

  assert.ok(safe instanceof Error);
  assert.ok(!safe.message.includes("secret-value"));
  assert.ok(safe.message.includes("select $1"));
  assert.ok(safe.cause instanceof Error);
  assert.equal(safe.cause.message, "boom");
  assert.ok(safe.stack?.includes("errors.test.ts"));
});

test("toLoggableError passes other errors through untouched", () => {
  const original = new Error("plain");

  assert.equal(toLoggableError(original), original);
});
