# Lab 02: graceful shutdown under load

Question: when the process receives a termination signal while serving requests, what happens to the requests in flight?

## Setup

- `POST /auth/register` as the target: argon2id plus a database insert, so each request is in flight for tens of milliseconds. `/health` is too fast to have anything in flight.
- k6, 20 virtual users, 15 s, each request classified by outcome: `201`, cut mid-flight (`reset`/`EOF`), connection refused, `503`.
- Signal sent at second 7 of the run. Script: `apps/api/load/health.k6.js`.

## Run 1: default behaviour (no handler, `SIGKILL`)

| outcome            | count  |
| ------------------ | ------ |
| 201 created        | 1261   |
| cut mid-flight     | **20** |
| connection refused | 469997 |
| 503                | 0      |

Exactly 20 cut: one per virtual user. Every request that was in flight at the moment of the signal was lost; the client got a reset with no way to know whether the write happened. Server exit code 137.

## Run 2: `SIGTERM` handler with `app.close()`

| outcome            | count  |
| ------------------ | ------ |
| 201 created        | 1295   |
| cut mid-flight     | **1**  |
| connection refused | 468310 |
| 503                | 19     |

In-flight requests finished with their real status. The 19 requests that arrived on already-open keep-alive sockets during the drain got `503` from Fastify (`return503OnClosing`): a clean, retryable answer. Exit code 0 after `onClose` hooks closed the pool. Log shows `shutdown signal received` and `server closed` 34 ms apart.

The single cut request is the keep-alive race: Fastify destroys idle keep-alive sockets on close, and one socket was judged idle at the instant k6 wrote the next request into it. A load balancer draining the instance before the signal, or sending `Connection: close` during drain, removes this.

## What "connection refused" means here

Both runs show ~470k refused: after the process exits nobody listens on the port, and k6 keeps hammering for the remaining 8 s. In production a load balancer stops routing to the instance before `SIGTERM` (readiness probe fails, then the signal), so clients never see refused either. Our handler cannot fix that part; the platform does.

## What we keep

- Handle `SIGTERM` and `SIGINT`: log, `await app.close()`, exit 0. A hard timer (`setTimeout(..., 10s).unref()`) exits 1 if close hangs.
- Resource cleanup lives in plugins' `onClose` hooks (the db plugin ends the pool), not in `main.ts`.
- Signal listeners must not be async functions directly: `process.on(sig, () => { void shutdown(sig) })` (`no-misused-promises`).
- Drain order in production: readiness fails → LB stops routing → `SIGTERM` → in-flight completes → exit. Slice 13.
