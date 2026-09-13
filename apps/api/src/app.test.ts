import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./app.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

test("GET /health returns ok with version", async (t) => {
  const app = await createApp({ connectionString });
  t.after(() => app.close());

  const res = await app.inject({ method: "GET", url: "/health" });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { status: "ok", version: "0.0.1" });
});
