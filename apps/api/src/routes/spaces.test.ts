import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  problemSchema,
  spaceSchema,
  spacesResponseSchema,
} from "@ticketing/contracts";
import { spaces, venues } from "@ticketing/db";
import { createSpace } from "../spaces/service.ts";
import {
  createOrg,
  mustAddMember,
  signUp,
  startApp,
  type Actor,
  type TestApp,
} from "../testing/harness.ts";

let app: TestApp;
let owner: Actor;
let admin: Actor;
let staff: Actor;
let outsider: Actor;
let org: string;
let otherOrg: string;
let venueId: string;
let emptyVenueId: string;
let otherVenueId: string;
let expectedIds: string[];

async function seedVenue(organizationId: string) {
  const [row] = await app.db
    .insert(venues)
    .values({
      organizationId,
      name: "Test venue",
      slug: randomUUID(),
      timezone: "Europe/Istanbul",
    })
    .returning({ id: venues.id });
  assert.ok(row);
  return row.id;
}

before(async () => {
  app = await startApp();
  owner = await signUp(app);
  admin = await signUp(app);
  staff = await signUp(app);
  outsider = await signUp(app);
  org = await createOrg(app, owner);
  otherOrg = await createOrg(app, outsider);
  await mustAddMember(app, owner, org, admin, "admin");
  await mustAddMember(app, owner, org, staff, "staff");
  venueId = await seedVenue(org);
  emptyVenueId = await seedVenue(org);
  otherVenueId = await seedVenue(otherOrg);

  const rows = await app.db
    .insert(spaces)
    .values([
      { organizationId: org, venueId, name: "B", slug: "b", capacity: 100 },
      { organizationId: org, venueId, name: "A", slug: "a" },
      {
        organizationId: otherOrg,
        venueId: otherVenueId,
        name: "Other space",
        slug: "other",
      },
    ])
    .returning({ id: spaces.id });
  assert.ok(rows[0] && rows[1]);
  expectedIds = [rows[1].id, rows[0].id];
});

after(() => app.close());

test("createSpace persists fields and scopes slug suffixes to the venue", async () => {
  const name = `Yeni Salon ${randomUUID().slice(0, 8)}`;
  const venueId = await seedVenue(org);
  const otherVenueId = await seedVenue(otherOrg);
  const first = await createSpace(app.db, {
    organizationId: org,
    venueId,
    name,
    description: "Salon açıklaması",
    capacity: 120,
  });
  const second = await createSpace(app.db, {
    organizationId: org,
    venueId,
    name,
  });
  const elsewhere = await createSpace(app.db, {
    organizationId: otherOrg,
    venueId: otherVenueId,
    name,
  });
  assert.equal(first.description, "Salon açıklaması");
  assert.equal(first.capacity, 120);
  assert.equal(second.slug, `${first.slug}-2`);
  assert.equal(elsewhere.slug, first.slug);
  assert.equal(second.description, null);
  assert.equal(second.capacity, null);
});

test("createSpace rejects missing and other-tenant venues", async () => {
  for (const id of [randomUUID(), otherVenueId]) {
    await assert.rejects(
      createSpace(app.db, { organizationId: org, venueId: id, name: "Salon" }),
      { message: "Venue not found" },
    );
  }
});

test("createSpace rejects names without slug characters", async () => {
  await assert.rejects(
    createSpace(app.db, { organizationId: org, venueId, name: "!!!" }),
    { message: "Space name must contain letters or digits" },
  );
});

function list(as: Actor | null, organizationId: string, id: string) {
  return app.inject({
    method: "GET",
    url: `/organizations/${organizationId}/venues/${id}/spaces`,
    headers: as ? { cookie: as.cookie } : {},
  });
}

function create(
  as: Actor | null,
  organizationId: string,
  id: string,
  payload: Record<string, unknown> = { name: "Yeni Salon" },
) {
  return app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/venues/${id}/spaces`,
    headers: as ? { cookie: as.cookie } : {},
    payload,
  });
}

test("owner and admin create spaces that appear in the venue list", async () => {
  const id = await seedVenue(org);
  for (const actor of [owner, admin]) {
    const res = await create(actor, org, id, {
      name: "  Büyük Salon  ",
      description: "  Açıklama  ",
      capacity: 200,
    });
    assert.equal(res.statusCode, 201);
    const space = spaceSchema.parse(res.json());
    assert.equal(space.name, "Büyük Salon");
    assert.equal(space.description, "Açıklama");
    assert.equal(space.capacity, 200);
    assert.equal(space.organizationId, org);
    assert.equal(space.venueId, id);
    const listed = spacesResponseSchema.parse(
      (await list(actor, org, id)).json(),
    );
    assert.ok(listed.some((item) => item.id === space.id));
  }
});

test("space creation requires a session and owner or admin role", async () => {
  assert.equal((await create(null, org, venueId)).statusCode, 401);
  assert.equal((await create(staff, org, venueId)).statusCode, 403);
  const outsiderRes = await create(outsider, org, venueId);
  assert.equal(outsiderRes.statusCode, 404);
  assert.equal(
    problemSchema.parse(outsiderRes.json()).type,
    "/problems/organization-not-found",
  );
});

test("space creation rejects missing and other-tenant venues", async () => {
  for (const id of [randomUUID(), otherVenueId]) {
    const res = await create(owner, org, id);
    assert.equal(res.statusCode, 404);
    assert.equal(
      problemSchema.parse(res.json()).type,
      "/problems/venue-not-found",
    );
  }
});

test("space creation validates names and capacity", async () => {
  for (const payload of [
    { name: " " },
    { name: "!!!" },
    { name: "Salon", capacity: 0 },
    { name: "Salon", capacity: -1 },
    { name: "Salon", capacity: 1.5 },
  ]) {
    const res = await create(owner, org, venueId, payload);
    assert.equal(res.statusCode, 400);
    problemSchema.parse(res.json());
  }
});

test("owner, admin and staff list only the venue's spaces in name order", async () => {
  for (const actor of [owner, admin, staff]) {
    const res = await list(actor, org, venueId);
    assert.equal(res.statusCode, 200);
    const result = spacesResponseSchema.parse(res.json());
    assert.deepEqual(
      result.map((space) => space.id),
      expectedIds,
    );
    assert.ok(result.every((space) => space.organizationId === org));
    assert.ok(result.every((space) => space.venueId === venueId));
    assert.equal(result[0]?.description, null);
    assert.equal(result[0]?.capacity, null);
    assert.equal(result[1]?.capacity, 100);
  }
});

test("a venue without spaces returns an empty list", async () => {
  const res = await list(owner, org, emptyVenueId);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(spacesResponseSchema.parse(res.json()), []);
});

test("unknown and other-tenant venues both return venue-not-found", async () => {
  for (const id of [randomUUID(), otherVenueId]) {
    const res = await list(owner, org, id);
    assert.equal(res.statusCode, 404);
    assert.equal(
      problemSchema.parse(res.json()).type,
      "/problems/venue-not-found",
    );
  }
});

test("an outsider cannot list spaces through another organization", async () => {
  const res = await list(outsider, org, venueId);
  assert.equal(res.statusCode, 404);
  assert.equal(
    problemSchema.parse(res.json()).type,
    "/problems/organization-not-found",
  );
});

test("listing spaces requires a session", async () => {
  const res = await list(null, org, venueId);
  assert.equal(res.statusCode, 401);
  problemSchema.parse(res.json());
});

test("invalid venue ids are rejected by validation", async () => {
  const res = await list(owner, org, "invalid");
  assert.equal(res.statusCode, 400);
  assert.ok(
    problemSchema
      .parse(res.json())
      .errors?.some((error) => error.field === "venueId"),
  );
});
