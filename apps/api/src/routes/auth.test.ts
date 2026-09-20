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
  app = await createApp({
    connectionString,
    logger: false,
    secureCookies: false,
  });
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

// Register + login helper: every login test needs a real account.
async function registerAndLogin(email: string, password: string) {
  const reg = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password },
  });
  assert.equal(reg.statusCode, 201);
  return app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
}

test("POST /auth/login sets an HttpOnly session cookie and returns the user", async () => {
  const email = uniqueEmail();
  const res = await registerAndLogin(email, "correct horse battery");

  assert.equal(res.statusCode, 200);

  const body: unknown = res.json();
  assert.ok(body && typeof body === "object");
  assert.ok("id" in body && typeof body.id === "string");
  assert.ok("email" in body && body.email === email.toLowerCase());
  assert.ok("fullName" in body && body.fullName === null);

  // set-cookie may be a string or an array; normalise to one string.
  const cookie = String(res.headers["set-cookie"]);
  assert.match(cookie, /^sid=[A-Za-z0-9_-]+;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Secure/, "secureCookies is false in tests");
});

test("POST /auth/login rejects a wrong password with the same problem type as an unknown email", async () => {
  const email = uniqueEmail();
  const reg = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "correct horse battery" },
  });
  assert.equal(reg.statusCode, 201);

  const wrongPassword = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password: "wrong horse battery" },
  });
  const unknownEmail = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: uniqueEmail(), password: "correct horse battery" },
  });

  for (const res of [wrongPassword, unknownEmail]) {
    assert.equal(res.statusCode, 401);
    assert.equal(problem(res.json()).type, "/problems/invalid-credentials");
    assert.equal(res.headers["set-cookie"], undefined, "no cookie on failure");
  }
});

// Pull the bare "sid=<token>" pair out of a Set-Cookie header so it can be sent back.
function sessionCookie(res: { headers: Record<string, unknown> }): string {
  const match = /^(sid=[^;]+)/.exec(String(res.headers["set-cookie"]));
  assert.ok(match?.[1], "login must set the sid cookie");
  return match[1];
}

test("GET /auth/me returns the logged-in user when the session cookie is sent", async () => {
  const email = uniqueEmail();
  const login = await registerAndLogin(email, "correct horse battery");
  assert.equal(login.statusCode, 200);

  const me = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: { cookie: sessionCookie(login) },
  });

  assert.equal(me.statusCode, 200);
  assert.deepEqual(me.json(), login.json());
});

test("GET /auth/me is 401 without a cookie and with an unknown token", async () => {
  const noCookie = await app.inject({ method: "GET", url: "/auth/me" });
  const bogus = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: { cookie: "sid=not-a-real-token" },
  });

  for (const res of [noCookie, bogus]) {
    assert.equal(res.statusCode, 401);
    assert.equal(problem(res.json()).type, "/problems/unauthenticated");
  }
});
