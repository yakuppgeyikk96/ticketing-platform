import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./app.ts";

test("GET /health returns ok with version", async (t) => {
  const app = createApp();

  t.after(() => app.close());

  const res = await app.inject({
    method: "GET",
    url: "/health",
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { status: "ok", version: "0.0.1" });
});
