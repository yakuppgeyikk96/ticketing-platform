import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./app.ts";

test("GET /health returns ok with version", async (t) => {
  const server = createApp().listen(0);
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address && typeof address === "object");

  const res = await fetch(`http://127.0.0.1:${address.port}/health`);
  const body: unknown = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(body, { status: "ok", version: "0.0.1" });
});
