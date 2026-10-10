import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  problemSchema,
  venueSchema,
  venuesResponseSchema,
  type CreateVenueInput,
} from "@ticketing/contracts";
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
let staff: Actor;
let org: string;
// A second organization with its own owner: the tenant boundary under test.
let outsider: Actor;
let otherOrg: string;

before(async () => {
  app = await startApp();
  owner = await signUp(app);
  staff = await signUp(app);
  org = await createOrg(app, owner);
  await mustAddMember(app, owner, org, staff, "staff");
  outsider = await signUp(app);
  otherOrg = await createOrg(app, outsider);
});
after(() => app.close());

function createVenue(
  as: Actor,
  organizationId: string,
  payload: Partial<CreateVenueInput> & Record<string, unknown>,
) {
  return app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/venues`,
    headers: { cookie: as.cookie },
    payload: { timezone: "Europe/Istanbul", ...payload },
  });
}

function getVenue(as: Actor, organizationId: string, venueId: string) {
  return app.inject({
    method: "GET",
    url: `/organizations/${organizationId}/venues/${venueId}`,
    headers: { cookie: as.cookie },
  });
}

test("owner creates a venue; slug derives from the name", async () => {
  const res = await createVenue(owner, org, {
    name: "Büyük Salon",
    city: "İstanbul",
    capacity: 500,
  });
  assert.equal(res.statusCode, 201);
  const venue = venueSchema.parse(res.json());
  assert.equal(venue.organizationId, org);
  assert.equal(venue.slug, "buyuk-salon");
  assert.equal(venue.address, null);
  assert.equal(venue.capacity, 500);
});

test("same name twice in one organization gets a numbered slug", async () => {
  const name = `Sahne ${randomUUID().slice(0, 6)}`;
  const first = venueSchema.parse(
    (await createVenue(owner, org, { name })).json(),
  );
  const second = venueSchema.parse(
    (await createVenue(owner, org, { name })).json(),
  );
  assert.equal(second.slug, `${first.slug}-2`);
});

test("same slug is free in a different organization", async () => {
  const name = `Ortak ${randomUUID().slice(0, 6)}`;
  const mine = venueSchema.parse(
    (await createVenue(owner, org, { name })).json(),
  );
  const theirs = venueSchema.parse(
    (await createVenue(outsider, otherOrg, { name })).json(),
  );
  assert.equal(theirs.slug, mine.slug);
});

test("unknown time zone is a validation error", async () => {
  const res = await createVenue(owner, org, {
    name: "Yanlış Saat",
    timezone: "Istanbul/Europe",
  });
  assert.equal(res.statusCode, 400);
  const problem = problemSchema.parse(res.json());
  assert.ok(problem.errors?.some((e) => e.field === "timezone"));
});

test("staff can list and read venues but not create them", async () => {
  const created = venueSchema.parse(
    (await createVenue(owner, org, { name: "Staff Görür" })).json(),
  );

  const list = await app.inject({
    method: "GET",
    url: `/organizations/${org}/venues`,
    headers: { cookie: staff.cookie },
  });
  assert.equal(list.statusCode, 200);
  const venues = venuesResponseSchema.parse(list.json());
  assert.ok(venues.some((v) => v.id === created.id));

  const one = await getVenue(staff, org, created.id);
  assert.equal(one.statusCode, 200);

  const denied = await createVenue(staff, org, { name: "Staff Yazamaz" });
  assert.equal(denied.statusCode, 403);
});

test("list is ordered by name and scoped to the organization", async () => {
  const res = await app.inject({
    method: "GET",
    url: `/organizations/${org}/venues`,
    headers: { cookie: owner.cookie },
  });
  const venues = venuesResponseSchema.parse(res.json());
  const names = venues.map((v) => v.name);
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b, "tr")),
  );
  assert.ok(venues.every((v) => v.organizationId === org));
});

test("another organization's venue id reads as not found", async () => {
  const theirs = venueSchema.parse(
    (await createVenue(outsider, otherOrg, { name: "Onların Salonu" })).json(),
  );
  // Owner of org asks for a venue that exists, but in otherOrg.
  const res = await getVenue(owner, org, theirs.id);
  assert.equal(res.statusCode, 404);
  assert.equal(
    problemSchema.parse(res.json()).type,
    "/problems/venue-not-found",
  );
});

test("a non-member gets 404 for the organization itself", async () => {
  const res = await app.inject({
    method: "GET",
    url: `/organizations/${org}/venues`,
    headers: { cookie: outsider.cookie },
  });
  assert.equal(res.statusCode, 404);
});
