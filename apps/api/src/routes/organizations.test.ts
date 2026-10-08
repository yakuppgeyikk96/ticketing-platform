import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  currentUserSchema,
  memberSchema,
  membersResponseSchema,
  userOrganizationsResponseSchema,
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
  return (await signUp()).cookie;
}

// Same, but also hand back the email so another test can add this user as a member.
async function signUp(): Promise<{ cookie: string; email: string }> {
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
  return { cookie: match[1], email: email.toLowerCase() };
}

// Create an organization as the given user, return its id.
async function createOrg(cookie: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/organizations",
    headers: { cookie },
    payload: { name: uniqueName() },
  });
  assert.equal(res.statusCode, 201);
  return organizationSchema.parse(res.json()).id;
}

function addMember(
  cookie: string,
  organizationId: string,
  payload: { email: string; role: string },
) {
  return app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/members`,
    headers: { cookie },
    payload,
  });
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

test("GET /organizations lists only the caller's organizations, with role, ordered by name", async () => {
  const alice = await loginCookie();
  const bob = await loginCookie();

  // Created out of order on purpose; the list must sort by name.
  const suffix = randomUUID().slice(0, 8);
  const names = [`Zeytin Sahne ${suffix}`, `Anadolu Tiyatro ${suffix}`];
  for (const name of names) {
    const res = await app.inject({
      method: "POST",
      url: "/organizations",
      headers: { cookie: alice },
      payload: { name },
    });
    assert.equal(res.statusCode, 201);
  }
  const bobsOrg = await app.inject({
    method: "POST",
    url: "/organizations",
    headers: { cookie: bob },
    payload: { name: uniqueName() },
  });
  assert.equal(bobsOrg.statusCode, 201);

  const res = await app.inject({
    method: "GET",
    url: "/organizations",
    headers: { cookie: alice },
  });

  assert.equal(res.statusCode, 200);
  const list = userOrganizationsResponseSchema.parse(res.json());
  assert.deepEqual(
    list.map((m) => m.name),
    [`Anadolu Tiyatro ${suffix}`, `Zeytin Sahne ${suffix}`],
  );
  assert.ok(list.every((m) => m.role === "owner"));
  assert.ok(
    !list.some((m) => m.id === organizationSchema.parse(bobsOrg.json()).id),
  );
});

test("GET /organizations is an empty list for a user without memberships", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/organizations",
    headers: { cookie: await loginCookie() },
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), []);
});

test("GET /organizations is 401 without a session cookie", async () => {
  const res = await app.inject({ method: "GET", url: "/organizations" });

  assert.equal(res.statusCode, 401);
  assert.equal(problem(res.json()).type, "/problems/unauthenticated");
});

test("POST /organizations/:id/members lets the owner add an existing user with a role", async () => {
  const owner = await signUp();
  const newcomer = await signUp();
  const orgId = await createOrg(owner.cookie);

  const res = await addMember(owner.cookie, orgId, {
    email: newcomer.email.toUpperCase(),
    role: "staff",
  });

  assert.equal(res.statusCode, 201);
  const member = memberSchema.parse(res.json());
  assert.equal(member.email, newcomer.email);
  assert.equal(member.role, "staff");

  // The newcomer now sees the organization in their own list, with that role.
  const list = await app.inject({
    method: "GET",
    url: "/organizations",
    headers: { cookie: newcomer.cookie },
  });
  const mine = userOrganizationsResponseSchema.parse(list.json());
  assert.deepEqual(
    mine.map((o) => [o.id, o.role]),
    [[orgId, "staff"]],
  );
});

test("POST /organizations/:id/members is 403 for staff and 404 for non-members", async () => {
  const owner = await signUp();
  const staff = await signUp();
  const outsider = await signUp();
  const orgId = await createOrg(owner.cookie);
  const added = await addMember(owner.cookie, orgId, {
    email: staff.email,
    role: "staff",
  });
  assert.equal(added.statusCode, 201);

  const byStaff = await addMember(staff.cookie, orgId, {
    email: outsider.email,
    role: "staff",
  });
  assert.equal(byStaff.statusCode, 403);
  assert.equal(problem(byStaff.json()).type, "/problems/insufficient-role");

  // A non-member must not learn the organization exists.
  const byOutsider = await addMember(outsider.cookie, orgId, {
    email: staff.email,
    role: "staff",
  });
  assert.equal(byOutsider.statusCode, 404);
  assert.equal(
    problem(byOutsider.json()).type,
    "/problems/organization-not-found",
  );
});

test("POST /organizations/:id/members is 404 for an unknown email and 409 when already a member", async () => {
  const owner = await signUp();
  const orgId = await createOrg(owner.cookie);

  const unknown = await addMember(owner.cookie, orgId, {
    email: `nobody+${randomUUID()}@example.com`,
    role: "admin",
  });
  assert.equal(unknown.statusCode, 404);
  assert.equal(problem(unknown.json()).type, "/problems/user-not-found");

  // The owner is already a member through the create transaction.
  const again = await addMember(owner.cookie, orgId, {
    email: owner.email,
    role: "admin",
  });
  assert.equal(again.statusCode, 409);
  assert.equal(problem(again.json()).type, "/problems/already-member");
});

test("POST /organizations/:id/members validates the id, the role and the session", async () => {
  const owner = await signUp();
  const orgId = await createOrg(owner.cookie);

  const badId = await addMember(owner.cookie, "not-a-uuid", {
    email: owner.email,
    role: "staff",
  });
  assert.equal(badId.statusCode, 400);
  assert.equal(problem(badId.json()).type, "/problems/validation");

  const badRole = await addMember(owner.cookie, orgId, {
    email: owner.email,
    role: "king",
  });
  assert.equal(badRole.statusCode, 400);
  assert.ok(problem(badRole.json()).errors?.some((e) => e.field === "role"));

  const noCookie = await app.inject({
    method: "POST",
    url: `/organizations/${orgId}/members`,
    payload: { email: owner.email, role: "staff" },
  });
  assert.equal(noCookie.statusCode, 401);
});

function removeMember(cookie: string, organizationId: string, userId: string) {
  return app.inject({
    method: "DELETE",
    url: `/organizations/${organizationId}/members/${userId}`,
    headers: { cookie },
  });
}

// Add a user and return their id (the API only hands it out on the add response).
async function addAndGetId(
  ownerCookie: string,
  orgId: string,
  email: string,
  role: "owner" | "admin" | "staff",
): Promise<string> {
  const res = await addMember(ownerCookie, orgId, { email, role });
  assert.equal(res.statusCode, 201);
  return memberSchema.parse(res.json()).userId;
}

async function ownerCount(orgId: string): Promise<number> {
  const rows = await app.db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId));
  return rows.filter((r) => r.role === "owner").length;
}

test("DELETE /organizations/:id/members/:userId removes a member; a second delete is 404", async () => {
  const owner = await signUp();
  const staff = await signUp();
  const orgId = await createOrg(owner.cookie);
  const staffId = await addAndGetId(owner.cookie, orgId, staff.email, "staff");

  const res = await removeMember(owner.cookie, orgId, staffId);
  assert.equal(res.statusCode, 204);
  assert.equal(res.body, "");

  const list = await app.inject({
    method: "GET",
    url: "/organizations",
    headers: { cookie: staff.cookie },
  });
  assert.deepEqual(list.json(), []);

  const again = await removeMember(owner.cookie, orgId, staffId);
  assert.equal(again.statusCode, 404);
  assert.equal(problem(again.json()).type, "/problems/member-not-found");
});

test("DELETE /organizations/:id/members/:userId refuses self-removal", async () => {
  const owner = await signUp();
  const orgId = await createOrg(owner.cookie);
  const me = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: { cookie: owner.cookie },
  });
  const myId = currentUserSchema.parse(me.json()).id;

  const res = await removeMember(owner.cookie, orgId, myId);
  assert.equal(res.statusCode, 409);
  assert.equal(problem(res.json()).type, "/problems/cannot-remove-self");
});

test("DELETE /organizations/:id/members/:userId is 403 for admins and 404 for outsiders", async () => {
  const owner = await signUp();
  const admin = await signUp();
  const staff = await signUp();
  const outsider = await signUp();
  const orgId = await createOrg(owner.cookie);
  const adminId = await addAndGetId(owner.cookie, orgId, admin.email, "admin");
  const staffId = await addAndGetId(owner.cookie, orgId, staff.email, "staff");

  const byAdmin = await removeMember(admin.cookie, orgId, staffId);
  assert.equal(byAdmin.statusCode, 403);
  assert.equal(problem(byAdmin.json()).type, "/problems/insufficient-role");

  const byOutsider = await removeMember(outsider.cookie, orgId, adminId);
  assert.equal(byOutsider.statusCode, 404);
  assert.equal(
    problem(byOutsider.json()).type,
    "/problems/organization-not-found",
  );

  // A member id from another organization must not be removable through this one.
  const otherOrgId = await createOrg(outsider.cookie);
  const crossTenant = await removeMember(owner.cookie, otherOrgId, staffId);
  assert.equal(crossTenant.statusCode, 404);
});

test("DELETE keeps at least one owner when two owners remove each other concurrently", async () => {
  const ali = await signUp();
  const ayse = await signUp();
  const orgId = await createOrg(ali.cookie);
  const ayseId = await addAndGetId(ali.cookie, orgId, ayse.email, "owner");
  const aliMe = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: { cookie: ali.cookie },
  });
  const aliId = currentUserSchema.parse(aliMe.json()).id;
  assert.equal(await ownerCount(orgId), 2);

  // Both requests start before either commits; the row lock must serialise them.
  const [a, b] = await Promise.all([
    removeMember(ali.cookie, orgId, ayseId),
    removeMember(ayse.cookie, orgId, aliId),
  ]);

  const statuses = [a.statusCode, b.statusCode].sort();
  // Exactly one wins. The loser is already removed by the time it looks:
  // 404 if its preHandler ran after the winner committed, 403 if it got past
  // the preHandler and the in-transaction actor check caught it after the lock.
  assert.equal(statuses[0], 204);
  assert.ok(statuses[1] === 403 || statuses[1] === 404, `got ${statuses[1]}`);
  assert.equal(await ownerCount(orgId), 1);
});

test("GET /organizations/:id returns the organization with the caller's role", async () => {
  const owner = await signUp();
  const staff = await signUp();
  const orgId = await createOrg(owner.cookie);
  await addAndGetId(owner.cookie, orgId, staff.email, "staff");

  const asOwner = await app.inject({
    method: "GET",
    url: `/organizations/${orgId}`,
    headers: { cookie: owner.cookie },
  });
  const asStaff = await app.inject({
    method: "GET",
    url: `/organizations/${orgId}`,
    headers: { cookie: staff.cookie },
  });

  assert.equal(asOwner.statusCode, 200);
  assert.equal(asStaff.statusCode, 200);
  // Same organization, different role: the role belongs to the caller, not the org.
  const a = userOrganizationsResponseSchema.element.parse(asOwner.json());
  const b = userOrganizationsResponseSchema.element.parse(asStaff.json());
  assert.equal(a.id, orgId);
  assert.deepEqual([a.role, b.role], ["owner", "staff"]);
  assert.equal(a.name, b.name);
});

test("GET /organizations/:id/members lists members ordered by email, visible to every role", async () => {
  const owner = await signUp();
  const staff = await signUp();
  const orgId = await createOrg(owner.cookie);
  const staffId = await addAndGetId(owner.cookie, orgId, staff.email, "staff");

  const res = await app.inject({
    method: "GET",
    url: `/organizations/${orgId}/members`,
    headers: { cookie: staff.cookie },
  });

  assert.equal(res.statusCode, 200);
  const members = membersResponseSchema.parse(res.json());
  assert.equal(members.length, 2);
  assert.deepEqual(
    members.map((m) => m.email),
    [...members.map((m) => m.email)].sort(),
  );
  assert.ok(members.some((m) => m.userId === staffId && m.role === "staff"));
  assert.ok(members.some((m) => m.email === owner.email && m.role === "owner"));
});
