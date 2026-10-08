import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  membersResponseSchema,
  problemSchema,
  userOrganizationsResponseSchema,
} from "@ticketing/contracts";
import { organizationMembers } from "@ticketing/db";
import { and, eq } from "drizzle-orm";
import {
  addMember,
  createOrg,
  mustAddMember,
  removeMember,
  signUp,
  startApp,
  type Actor,
  type TestApp,
} from "../testing/harness.ts";

// Every test here is an attack: someone reaching into an organization that is
// not theirs. See labs/04-tenant-leak.md for which defence stops which attack.

let app: TestApp;
// The victim organization: one owner, one staff member.
let victimOwner: Actor;
let victimStaff: Actor;
let victimOrg: string;
// The attacker: a real user who owns a different organization.
let attacker: Actor;
let attackerOrg: string;

before(async () => {
  app = await startApp();
  victimOwner = await signUp(app);
  victimStaff = await signUp(app);
  victimOrg = await createOrg(app, victimOwner);
  await mustAddMember(app, victimOwner, victimOrg, victimStaff, "staff");
  attacker = await signUp(app);
  attackerOrg = await createOrg(app, attacker);
});
after(() => app.close());

// Ground truth straight from the table, not through the API under attack.
async function roleIn(orgId: string, userId: string): Promise<string | null> {
  const [row] = await app.db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, userId),
      ),
    );
  return row?.role ?? null;
}

test("attack 1: an outsider cannot remove a member of another organization", async () => {
  const res = await removeMember(app, attacker, victimOrg, victimStaff.id);

  assert.equal(res.statusCode, 404);
  assert.equal(await roleIn(victimOrg, victimStaff.id), "staff");
});

test("attack 2: an outsider cannot add themselves to another organization", async () => {
  const res = await addMember(app, attacker, victimOrg, {
    email: attacker.email,
    role: "owner",
  });

  assert.equal(res.statusCode, 404);
  assert.equal(await roleIn(victimOrg, attacker.id), null);
});

test("attack 3: an owner cannot remove another organization's member through their own organization", async () => {
  // The attacker passes the role check: it is their own organization.
  // Only the tenant column in the DELETE's WHERE protects the victim's row.
  const res = await removeMember(app, attacker, attackerOrg, victimStaff.id);

  assert.equal(res.statusCode, 404);
  assert.equal(
    problemSchema.parse(res.json()).type,
    "/problems/member-not-found",
  );
  assert.equal(await roleIn(victimOrg, victimStaff.id), "staff");
});

test("attack 4: staff cannot escalate inside their own organization", async () => {
  const removeOwner = await removeMember(
    app,
    victimStaff,
    victimOrg,
    victimOwner.id,
  );
  const outsider = await signUp(app);
  const addFriendAsOwner = await addMember(app, victimStaff, victimOrg, {
    email: outsider.email,
    role: "owner",
  });

  assert.equal(removeOwner.statusCode, 403);
  assert.equal(addFriendAsOwner.statusCode, 403);
  assert.equal(await roleIn(victimOrg, victimOwner.id), "owner");
  assert.equal(await roleIn(victimOrg, outsider.id), null);
});

test("attack 5: an existing organization and a made-up id are indistinguishable to an outsider", async () => {
  const real = await removeMember(app, attacker, victimOrg, victimStaff.id);
  const madeUp = await removeMember(
    app,
    attacker,
    randomUUID(),
    victimStaff.id,
  );

  assert.equal(real.statusCode, madeUp.statusCode);
  const a = problemSchema.parse(real.json());
  const b = problemSchema.parse(madeUp.json());
  assert.deepEqual([a.type, a.title, a.detail], [b.type, b.title, b.detail]);
});

test("attack 6: a removed member keeps a valid session but loses the organization", async () => {
  const temp = await signUp(app);
  await mustAddMember(app, victimOwner, victimOrg, temp, "admin");
  const removed = await removeMember(app, victimOwner, victimOrg, temp.id);
  assert.equal(removed.statusCode, 204);

  // Same cookie as before the removal; the session itself is still fine.
  const me = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: { cookie: temp.cookie },
  });
  assert.equal(me.statusCode, 200);

  const res = await addMember(app, temp, victimOrg, {
    email: attacker.email,
    role: "staff",
  });
  assert.equal(res.statusCode, 404);
  assert.equal(await roleIn(victimOrg, attacker.id), null);
});

test("attack 7: the organization list never shows another user's organization", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/organizations",
    headers: { cookie: attacker.cookie },
  });

  assert.equal(res.statusCode, 200);
  const ids = userOrganizationsResponseSchema
    .parse(res.json())
    .map((o) => o.id);
  assert.deepEqual(ids, [attackerOrg]);
});

test("attack 8: an outsider can read neither the organization nor its members", async () => {
  const org = await app.inject({
    method: "GET",
    url: `/organizations/${victimOrg}`,
    headers: { cookie: attacker.cookie },
  });
  const members = await app.inject({
    method: "GET",
    url: `/organizations/${victimOrg}/members`,
    headers: { cookie: attacker.cookie },
  });

  for (const res of [org, members]) {
    assert.equal(res.statusCode, 404);
    assert.equal(
      problemSchema.parse(res.json()).type,
      "/problems/organization-not-found",
    );
  }
});

test("attack 9: the member list of one organization never includes another's members", async () => {
  const res = await app.inject({
    method: "GET",
    url: `/organizations/${attackerOrg}/members`,
    headers: { cookie: attacker.cookie },
  });

  assert.equal(res.statusCode, 200);
  const emails = membersResponseSchema.parse(res.json()).map((m) => m.email);
  assert.deepEqual(emails, [attacker.email]);
});
