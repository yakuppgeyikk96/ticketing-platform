import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createDb, outbox, type Db } from "@ticketing/db";
import { eq } from "drizzle-orm";
import { claimNext, markFailed, markProcessed } from "./outbox.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

let db: Db;
let close: () => Promise<void>;
before(() => {
  ({ db, close } = createDb(connectionString));
});
after(() => close());

// Each test owns a unique type so rows from other tests (and other runs)
// never show up in its claims.
function uniqueType() {
  return `test.${randomUUID()}`;
}

async function insertRow(type: string) {
  const [row] = await db
    .insert(outbox)
    .values({ type, payload: { n: 1 } })
    .returning({ id: outbox.id });
  assert.ok(row);
  return row.id;
}

test("claimNext returns a pending row of the requested type and locks it", async () => {
  const type = uniqueType();
  const id = await insertRow(type);

  const row = await claimNext(db, [type]);
  assert.equal(row?.id, id);
  assert.ok(row.lockedAt, "claim sets locked_at");

  // Locked now, so a second claim finds nothing.
  assert.equal(await claimNext(db, [type]), null);
});

test("two concurrent claims get different rows", async () => {
  const type = uniqueType();
  const ids = [await insertRow(type), await insertRow(type)];

  const [a, b] = await Promise.all([
    claimNext(db, [type]),
    claimNext(db, [type]),
  ]);
  assert.ok(a && b);
  assert.notEqual(a.id, b.id);
  assert.deepEqual([a.id, b.id].sort(), ids.sort());
});

test("markProcessed takes the row out of the pending set", async () => {
  const type = uniqueType();
  const id = await insertRow(type);

  const row = await claimNext(db, [type]);
  assert.equal(row?.id, id);
  await markProcessed(db, id);

  const [after] = await db
    .select({ processedAt: outbox.processedAt })
    .from(outbox)
    .where(eq(outbox.id, id));
  assert.ok(after?.processedAt);
});

test("markFailed bumps attempts, releases the lock and delays the next attempt", async () => {
  const type = uniqueType();
  const id = await insertRow(type);

  const row = await claimNext(db, [type]);
  assert.equal(row?.id, id);
  await markFailed(db, id, new Error("smtp down"));

  const [after] = await db
    .select({
      attempts: outbox.attempts,
      lastError: outbox.lastError,
      lockedAt: outbox.lockedAt,
      nextAttemptAt: outbox.nextAttemptAt,
      processedAt: outbox.processedAt,
    })
    .from(outbox)
    .where(eq(outbox.id, id));
  assert.ok(after);
  assert.equal(after.attempts, 1);
  assert.match(after.lastError ?? "", /smtp down/);
  assert.equal(after.lockedAt, null);
  assert.equal(after.processedAt, null);
  assert.ok(
    after.nextAttemptAt > new Date(),
    "backoff pushes it into the future",
  );

  // Not claimable until next_attempt_at.
  assert.equal(await claimNext(db, [type]), null);
});

test("claimNext ignores rows of other types", async () => {
  const mine = uniqueType();
  const other = uniqueType();
  await insertRow(other);

  assert.equal(await claimNext(db, [mine]), null);
});
