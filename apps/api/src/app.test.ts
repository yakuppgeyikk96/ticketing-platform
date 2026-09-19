import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createApp } from "./app.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

test("GET /health returns ok with version", async (t) => {
  const app = await createApp({
    connectionString,
    logger: false,
    secureCookies: false,
  });
  t.after(() => app.close());

  const res = await app.inject({ method: "GET", url: "/health" });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { status: "ok", version: "0.0.1" });
});

test("GET /health answers 304 when If-None-Match carries the current ETag", async (t) => {
  const app = await createApp({
    connectionString,
    logger: false,
    secureCookies: false,
  });
  t.after(() => app.close());

  const first = await app.inject({ method: "GET", url: "/health" });
  const etag = first.headers.etag;
  assert.equal(typeof etag, "string");

  const second = await app.inject({
    method: "GET",
    url: "/health",
    headers: { "if-none-match": etag },
  });

  assert.equal(second.statusCode, 304);
  assert.equal(second.body, "");
});

// Just enough shape to assert on; the document itself is much larger.
const openapiDocSchema = z.object({
  openapi: z.string(),
  paths: z.record(
    z.string(),
    z.object({
      post: z
        .object({ responses: z.record(z.string(), z.unknown()) })
        .optional(),
    }),
  ),
  components: z.object({ schemas: z.record(z.string(), z.unknown()) }),
});

test("GET /docs/json serves the OpenAPI document generated from zod schemas", async (t) => {
  const app = await createApp({
    connectionString,
    logger: false,
    secureCookies: false,
  });
  t.after(() => app.close());

  const res = await app.inject({ method: "GET", url: "/docs/json" });
  assert.equal(res.statusCode, 200);

  const doc = openapiDocSchema.parse(res.json());
  assert.equal(doc.openapi, "3.1.0");

  const register = doc.paths["/auth/register"]?.post;
  assert.ok(register, "register route is documented");
  assert.ok("201" in register.responses);
  assert.ok("409" in register.responses);

  assert.ok("Problem" in doc.components.schemas);
  assert.ok("RegisterBody" in doc.components.schemas);
  assert.ok(
    !Object.keys(doc.paths).some((p) => p.startsWith("/docs")),
    "docs routes are not documented",
  );
});
