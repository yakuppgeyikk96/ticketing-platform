import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createApp } from "../app.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

// One app for the whole file: opening a pool per test is slow and pointless.
let app: Awaited<ReturnType<typeof createApp>>;
before(async () => {
  app = await createApp({ connectionString });
});
after(() => app.close());

// Fresh email per call so tests never collide with earlier runs' rows.
function uniqueEmail() {
  return `Yakup+${randomUUID()}@Example.com`;
}

test("POST /auth/register creates a user and normalizes the email", async () => {
  const email = uniqueEmail();

  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "correct horse battery" },
  });

  assert.equal(res.statusCode, 201);

  const body: unknown = res.json();
  assert.ok(body && typeof body === "object");
  assert.ok("id" in body && typeof body.id === "string");
  assert.ok("createdAt" in body && typeof body.createdAt === "string");
  assert.ok("email" in body);
  assert.equal(body.email, email.toLowerCase());
  assert.ok(!("passwordHash" in body));
});

test("POST /auth/register returns 409 if the two identical email is sent", async () => {
  const email = uniqueEmail();

  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "correct horse battery" },
  });

  assert.equal(res.statusCode, 201);

  const res2 = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "correct horse battery" },
  });

  assert.equal(res2.statusCode, 409);
  const body: unknown = res2.json();
  assert.ok(body && typeof body === "object" && "message" in body);
  assert.equal(body.message, "Email already registered");
});

test("POST /auth/register returns 400 if the provided password is not valid", async () => {
  const email = uniqueEmail();

  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "passwrd" },
  });

  assert.equal(res.statusCode, 400);
});
