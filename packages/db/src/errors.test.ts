import assert from "node:assert/strict";
import { test } from "node:test";
import { DrizzleQueryError } from "drizzle-orm";
import { toLoggableError } from "./errors.ts";

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
