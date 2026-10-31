import { outbox, type Db } from "@ticketing/db";
import { and, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";

export type OutboxRow = typeof outbox.$inferSelect;

export const LOCK_TTL_MS = 5 * 60 * 1000;

export async function claimNext(
  db: Db,
  types: readonly string[],
): Promise<OutboxRow | null> {
  const subquery = db
    .select({ id: outbox.id })
    .from(outbox)
    .where(
      and(
        isNull(outbox.processedAt),
        lte(outbox.nextAttemptAt, sql`now()`),
        or(
          isNull(outbox.lockedAt),
          lt(
            outbox.lockedAt,
            sql`now() - make_interval(secs => ${LOCK_TTL_MS / 1000})`,
          ),
        ),
        inArray(outbox.type, types),
      ),
    )
    .orderBy(outbox.id)
    .limit(1)
    .for("update", { skipLocked: true });

  const result = await db
    .update(outbox)
    .set({ lockedAt: sql`now()` })
    .where(eq(outbox.id, subquery))
    .returning();

  return result[0] ?? null;
}

export async function markProcessed(db: Db, id: string): Promise<void> {
  await db
    .update(outbox)
    .set({ processedAt: sql`now()` })
    .where(eq(outbox.id, id));
}

export async function markFailed(
  db: Db,
  id: string,
  err: unknown,
): Promise<void> {
  const lastErrorMessage = err instanceof Error ? err.message : String(err);

  await db
    .update(outbox)
    .set({
      attempts: sql`${outbox.attempts} + 1`,
      lastError: lastErrorMessage,
      lockedAt: null,
      nextAttemptAt: sql`now() + make_interval(secs => least(power(2, ${outbox.attempts} + 1), 300))`,
    })
    .where(eq(outbox.id, id));
}
