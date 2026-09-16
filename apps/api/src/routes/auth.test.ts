import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { problemSchema, type ProblemBody } from "@ticketing/contracts";
import { createApp } from "../app.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

// One app for the whole file: opening a pool per test is slow and pointless.
let app: Awaited<ReturnType<typeof createApp>>;
before(async () => {
  app = await createApp({ connectionString, logger: false });
});
after(() => app.close());

// Fresh email per call so tests never collide with earlier runs' rows.
function uniqueEmail() {
  return `Yakup+${randomUUID()}@Example.com`;
}

// Every error body must satisfy the problem contract; parse it once, then assert on fields.
function problem(body: unknown): ProblemBody {
  return problemSchema.parse(body);
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
  assert.match(
    res2.headers["content-type"] ?? "",
    /^application\/problem\+json/,
  );

  const body = problem(res2.json());
  assert.equal(body.type, "/problems/email-taken");
  assert.equal(body.title, "Email already registered");
  assert.equal(body.status, 409);
  assert.equal(body.instance, "/auth/register");
});

test("POST /auth/register returns 400 if the provided password is not valid", async () => {
  const email = uniqueEmail();

  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "passwrd" },
  });

  assert.equal(res.statusCode, 400);

  const body = problem(res.json());
  assert.equal(body.type, "/problems/validation");
  assert.ok(body.errors?.some((e) => e.field === "password"));
});

test("unknown route returns a 404 problem", async () => {
  const res = await app.inject({ method: "GET", url: "/nope" });

  assert.equal(res.statusCode, 404);
  assert.match(
    res.headers["content-type"] ?? "",
    /^application\/problem\+json/,
  );
  assert.equal(problem(res.json()).type, "/problems/not-found");
});
