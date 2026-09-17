import { createApp } from "./app.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const isProduction = process.env.NODE_ENV === "production";

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

await app.listen({ port: 3000, host: "127.0.0.1" });
