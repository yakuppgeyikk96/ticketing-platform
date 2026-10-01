# Lab 04: last owner race and the per-organization row lock

Question: two owners remove each other at the same moment. Does a transaction alone keep one owner in the organization?

## Setup

- One organization with exactly two owners, A and B.
- Two `psql` sessions, each driving one transaction by hand. A third session reads `pg_stat_activity`.
- Isolation level: the default, `READ COMMITTED`.

## Run 1: transaction, no lock

| step | session 1                   | session 2                   |
| ---- | --------------------------- | --------------------------- |
| 1    | `BEGIN`, count owners → 2   | `BEGIN`, count owners → 2   |
| 2    | delete A, returns instantly | delete B, returns instantly |
| 3    | count owners → 1            | count owners → 1            |
| 4    | `COMMIT`                    | `COMMIT`                    |

Final owner count: **0**.

Each session saw its own delete and not the other's, because the other had not committed. Both decisions were correct from where they stood. The deletes touched different rows, so nothing made either session wait. A transaction gives atomicity, not ordering.

## Run 2: `SELECT ... FOR UPDATE` on the organization row

| step | session 1                            | session 2                                            |
| ---- | ------------------------------------ | ---------------------------------------------------- |
| 1    | `BEGIN`, lock organization row       |                                                      |
| 2    |                                      | `BEGIN`, lock organization row → **does not return** |
| 3    | count owners → 2, delete A, `COMMIT` |                                                      |
| 4    |                                      | lock returns, count owners → **1**                   |

Final owner count: **1**. Session 2 counted after session 1 committed, so it saw the truth and could refuse.

While session 2 waited, `pg_stat_activity` showed it as `active` with `wait_event_type = Lock`, and `pg_blocking_pids(pid)` named session 1, which was `idle in transaction`. This is the first query to run when requests hang in production.

## Side observation: same-row deletes wait without any explicit lock

By mistake both sessions once ran the delete for the same member. The second delete hung until the first transaction ended. A write to a row already written by an open transaction always waits; `FOR UPDATE` is only needed when the decision depends on rows the transaction does not write.

## Why the organization row

- Locking the membership rows only locks rows that exist. An insert of a new owner would slip past.
- Inserting a membership takes `FOR KEY SHARE` on the referenced organization row (the foreign key). `FOR KEY SHARE` conflicts with `FOR UPDATE`, so the lock also holds back concurrent inserts for that organization. `FOR NO KEY UPDATE` would not.
- One fixed row per organization serialises all membership changes of that organization and nothing else.

## Deadlock rule

A deadlock needs two transactions taking two locks in opposite order: one holds the organization row and wants a user row, the other holds the user row and wants the organization row. Postgres detects the cycle after about a second and aborts one with `deadlock detected`.

Rule for this codebase: **a transaction that touches an organization's data locks the organization row first, before any other lock.** With a single order, a waiting transaction never holds anything another one needs.

## In the code

`removeMember` in `apps/api/src/organizations/service.ts`: lock, re-check the actor's role, find the target, count owners, delete with the tenant column in the `WHERE`.

The automated test fires both removals with `Promise.all`. With the lock the result is one `204` and one `403` or `404`: the loser is already removed when it gets the lock, so the in-transaction actor check fires before the owner count. Under today's rules (no self-removal, only owners remove) the `last-owner` branch cannot be reached; it stays as the data invariant for when "leave organization" or role changes arrive.

## Alternatives not taken

| option                              | why not here                                                     |
| ----------------------------------- | ---------------------------------------------------------------- |
| `SERIALIZABLE` isolation            | needs a retry loop on `40001`; the ordering is invisible in code |
| advisory lock                       | a natural row to lock already exists                             |
| `owner_count` column with a `CHECK` | extra column to keep in sync; worth it under heavy contention    |
| in-process or Redis mutex           | breaks with a second replica                                     |
