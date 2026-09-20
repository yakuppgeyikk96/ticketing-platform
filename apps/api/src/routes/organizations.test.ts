import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  organizationSchema,
  problemSchema,
  type ProblemBody,
} from "@ticketing/contracts";
import { organizationMembers } from "@ticketing/db";
import { eq } from "drizzle-orm";
import { createApp } from "../app.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

let app: Awaited<ReturnType<typeof createApp>>;
before(async () => {
  app = await createApp({
    connectionString,
    logger: false,
    secureCookies: false,
  });
});
after(() => app.close());

function problem(body: unknown): ProblemBody {
  return problemSchema.parse(body);
}

// Slugs persist across runs, so every test picks a name nobody used before.
function uniqueName() {
  return `Anadolu Tiyatro ${randomUUID().slice(0, 8)}`;
}

// Register + login, return the bare "sid=<token>" pair.
async function loginCookie(): Promise<string> {
  const email = `Yakup+${randomUUID()}@Example.com`;
  const password = "correct horse battery";
  const reg = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password },
  });
  assert.equal(reg.statusCode, 201);
  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  assert.equal(login.statusCode, 200);
  const match = /^(sid=[^;]+)/.exec(String(login.headers["set-cookie"]));
  assert.ok(match?.[1], "login must set the sid cookie");
  return match[1];
}

test("POST /organizations creates the organization with a derived slug and an owner membership", async () => {
  const cookie = await loginCookie();
  const name = uniqueName();

  const res = await app.inject({
    method: "POST",
    url: "/organizations",
    headers: { cookie },
    payload: { name },
  });

  assert.equal(res.statusCode, 201);

  const body: unknown = res.json();
  assert.ok(body && typeof body === "object");
  assert.ok("id" in body && typeof body.id === "string");
  assert.ok("name" in body && body.name === name);
  assert.ok(
    "slug" in body && body.slug === name.toLowerCase().replaceAll(" ", "-"),
  );
  assert.ok(!("createdAt" in body), "response schema strips unlisted fields");

  // The membership is written in the same transaction; check it landed.
  const members = await app.db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, body.id));
  assert.deepEqual(members, [{ role: "owner" }]);
});

test("POST /organizations appends -2 when the same name is used again", async () => {
  const cookie = await loginCookie();
  const name = uniqueName();

  const first = await app.inject({
    method: "POST",
    url: "/organizations",
    headers: { cookie },
    payload: { name },
  });
  const second = await app.inject({
    method: "POST",
    url: "/organizations",
    headers: { cookie },
    payload: { name },
  });

  assert.equal(first.statusCode, 201);
  assert.equal(second.statusCode, 201);

  const a = organizationSchema.parse(first.json());
  const b = organizationSchema.parse(second.json());
  assert.equal(b.slug, `${a.slug}-2`);
  assert.notEqual(a.id, b.id);
});

test("POST /organizations is 401 without a session cookie", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/organizations",
    payload: { name: uniqueName() },
  });

  assert.equal(res.statusCode, 401);
  assert.equal(problem(res.json()).type, "/problems/unauthenticated");
});

test("POST /organizations rejects a too-short name with a validation problem", async () => {
  const cookie = await loginCookie();

  const res = await app.inject({
    method: "POST",
    url: "/organizations",
    headers: { cookie },
    payload: { name: " A " },
  });

  assert.equal(res.statusCode, 400);
  const body = problem(res.json());
  assert.equal(body.type, "/problems/validation");
  assert.ok(body.errors?.some((e) => e.field === "name"));
});

test("POST /organizations rejects a name that leaves no slug characters", async () => {
  const cookie = await loginCookie();

  const res = await app.inject({
    method: "POST",
    url: "/organizations",
    headers: { cookie },
    payload: { name: "!!! ???" },
  });

  assert.equal(res.statusCode, 400);
  assert.equal(problem(res.json()).type, "/problems/invalid-name");
});
