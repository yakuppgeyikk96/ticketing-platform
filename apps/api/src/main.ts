import { createApp } from "./app.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const isProduction = process.env.NODE_ENV === "production";

let shuttingDown = false;

const app = await createApp({
  connectionString,
  logger: {
    level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
    // Paths pino replaces with "[Redacted]" before writing.
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "err.params",
      // pg puts the offending value in `detail` ("Key (lower(email))=(x@y) already exists").
      "err.cause.detail",
    ],
    // Production writes JSON for machines; development gets a readable stream.
    ...(isProduction ? {} : { transport: { target: "pino-pretty" } }),
  },
});

// Drain on SIGTERM/SIGINT: stop accepting, let in-flight requests finish,
// run onClose hooks (db pool), then exit. See labs/02-graceful-shutdown.md.
async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;

  shuttingDown = true;

  app.log.info({ signal }, "shutdown signal received");

  // Safety net: if close() hangs, exit anyway. unref() so this timer alone
  // never keeps the process alive.
  setTimeout(() => {
    app.log.error("graceful shutdown expired, exiting forcefully");
    process.exit(1);
  }, 10_000).unref();

  try {
    await app.close();
    app.log.info("server closed");
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, "error during shutdown");
    process.exit(1);
  }
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  // Listener must return void; `void` marks the promise as intentionally unawaited.
  process.on(signal, () => {
    void shutdown(signal);
  });
}

await app.listen({ port: 3000, host: "127.0.0.1" });
