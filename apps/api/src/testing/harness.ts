import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  currentUserSchema,
  memberSchema,
  organizationSchema,
  type MemberRole,
} from "@ticketing/contracts";
import { createApp } from "../app.ts";

// Not named test-*.ts and not under test/: node --test would run it as a test file.

export type TestApp = Awaited<ReturnType<typeof createApp>>;

export async function startApp(): Promise<TestApp> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return createApp({ connectionString, logger: false, secureCookies: false });
}

export interface Actor {
  id: string;
  email: string;
  // Bare "sid=<token>" pair, ready for the cookie header.
  cookie: string;
}

// Register + login a brand-new user.
export async function signUp(app: TestApp): Promise<Actor> {
  const email = `tenant+${randomUUID()}@example.com`;
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
  return {
    id: currentUserSchema.parse(login.json()).id,
    email,
    cookie: match[1],
  };
}

export async function createOrg(app: TestApp, owner: Actor): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/organizations",
    headers: { cookie: owner.cookie },
    payload: { name: `Tenant ${randomUUID().slice(0, 8)}` },
  });
  assert.equal(res.statusCode, 201);
  return organizationSchema.parse(res.json()).id;
}

export function addMember(
  app: TestApp,
  as: Actor,
  organizationId: string,
  payload: { email: string; role: MemberRole },
) {
  return app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/members`,
    headers: { cookie: as.cookie },
    payload,
  });
}

// Add and insist it worked; for test setup, not for the assertion under test.
export async function mustAddMember(
  app: TestApp,
  as: Actor,
  organizationId: string,
  member: Actor,
  role: MemberRole,
): Promise<void> {
  const res = await addMember(app, as, organizationId, {
    email: member.email,
    role,
  });
  assert.equal(res.statusCode, 201);
  assert.equal(memberSchema.parse(res.json()).userId, member.id);
}

export function removeMember(
  app: TestApp,
  as: Actor,
  organizationId: string,
  userId: string,
) {
  return app.inject({
    method: "DELETE",
    url: `/organizations/${organizationId}/members/${userId}`,
    headers: { cookie: as.cookie },
  });
}
