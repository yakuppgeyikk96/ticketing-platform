import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  eventSchema,
  occurrenceSchema,
  occurrencesResponseSchema,
  problemSchema,
  venueSchema,
  type OccurrenceStatus,
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
let venue: string;
let outsider: Actor;
let otherOrg: string;
let otherVenue: string;

before(async () => {
  app = await startApp();
  owner = await signUp(app);
  staff = await signUp(app);
  org = await createOrg(app, owner);
  await mustAddMember(app, owner, org, staff, "staff");
  venue = await mustCreateVenue(owner, org);
  outsider = await signUp(app);
  otherOrg = await createOrg(app, outsider);
  otherVenue = await mustCreateVenue(outsider, otherOrg);
});
after(() => app.close());

async function mustCreateVenue(as: Actor, organizationId: string) {
  const res = await app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/venues`,
    headers: { cookie: as.cookie },
    payload: {
      name: `Salon ${randomUUID().slice(0, 6)}`,
      timezone: "Europe/Istanbul",
    },
  });
  assert.equal(res.statusCode, 201);
  return venueSchema.parse(res.json()).id;
}

async function mustCreateEvent(as: Actor, organizationId: string) {
  const res = await app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/events`,
    headers: { cookie: as.cookie },
    payload: { title: `Etkinlik ${randomUUID().slice(0, 6)}` },
  });
  assert.equal(res.statusCode, 201);
  return eventSchema.parse(res.json()).id;
}

async function mustSetEventStatus(
  as: Actor,
  organizationId: string,
  eventId: string,
  status: string,
) {
  const res = await app.inject({
    method: "PATCH",
    url: `/organizations/${organizationId}/events/${eventId}/status`,
    headers: { cookie: as.cookie },
    payload: { status },
  });
  assert.equal(res.statusCode, 200);
}

function base(organizationId: string, eventId: string) {
  return `/organizations/${organizationId}/events/${eventId}/occurrences`;
}

function createOccurrence(
  as: Actor,
  organizationId: string,
  eventId: string,
  payload: Record<string, unknown>,
) {
  return app.inject({
    method: "POST",
    url: base(organizationId, eventId),
    headers: { cookie: as.cookie },
    payload: {
      venueId: venue,
      startsAt: "2026-12-01T20:00:00+03:00",
      ...payload,
    },
  });
}

async function mustCreateOccurrence(
  eventId: string,
  payload: Record<string, unknown> = {},
) {
  const res = await createOccurrence(owner, org, eventId, payload);
  assert.equal(res.statusCode, 201);
  return occurrenceSchema.parse(res.json());
}

function setStatus(
  as: Actor,
  organizationId: string,
  eventId: string,
  occurrenceId: string,
  status: OccurrenceStatus,
) {
  return app.inject({
    method: "PATCH",
    url: `${base(organizationId, eventId)}/${occurrenceId}/status`,
    headers: { cookie: as.cookie },
    payload: { status },
  });
}

test("owner creates an occurrence; instants come back in UTC", async () => {
  const eventId = await mustCreateEvent(owner, org);
  const res = await createOccurrence(owner, org, eventId, {
    startsAt: "2026-12-01T20:00:00+03:00",
    endsAt: "2026-12-01T23:00:00+03:00",
  });
  assert.equal(res.statusCode, 201);
  const occurrence = occurrenceSchema.parse(res.json());
  assert.equal(occurrence.eventId, eventId);
  assert.equal(occurrence.venueId, venue);
  assert.equal(occurrence.status, "draft");
  // +03:00 local evening is 17:00 UTC; the zone was the client's job.
  assert.equal(occurrence.startsAt, "2026-12-01T17:00:00.000Z");
  assert.equal(occurrence.endsAt, "2026-12-01T20:00:00.000Z");
});

test("endsAt is optional and comes back as null", async () => {
  const eventId = await mustCreateEvent(owner, org);
  const occurrence = await mustCreateOccurrence(eventId);
  assert.equal(occurrence.endsAt, null);
});

test("a start without an offset is a validation error", async () => {
  const eventId = await mustCreateEvent(owner, org);
  const res = await createOccurrence(owner, org, eventId, {
    startsAt: "2026-12-01T20:00:00",
  });
  assert.equal(res.statusCode, 400);
  assert.ok(
    problemSchema.parse(res.json()).errors?.some((e) => e.field === "startsAt"),
  );
});

test("endsAt before startsAt fails on the endsAt field", async () => {
  const eventId = await mustCreateEvent(owner, org);
  const res = await createOccurrence(owner, org, eventId, {
    startsAt: "2026-12-01T20:00:00Z",
    endsAt: "2026-12-01T19:00:00Z",
  });
  assert.equal(res.statusCode, 400);
  assert.ok(
    problemSchema.parse(res.json()).errors?.some((e) => e.field === "endsAt"),
  );
});

test("another organization's venue is rejected by the composite FK as 404", async () => {
  const eventId = await mustCreateEvent(owner, org);
  const res = await createOccurrence(owner, org, eventId, {
    venueId: otherVenue,
  });
  assert.equal(res.statusCode, 404);
  assert.equal(
    problemSchema.parse(res.json()).type,
    "/problems/venue-not-found",
  );
});

test("an unknown venue id answers the same 404", async () => {
  const eventId = await mustCreateEvent(owner, org);
  const res = await createOccurrence(owner, org, eventId, {
    venueId: randomUUID(),
  });
  assert.equal(res.statusCode, 404);
  assert.equal(
    problemSchema.parse(res.json()).type,
    "/problems/venue-not-found",
  );
});

test("an archived event takes no new occurrences", async () => {
  const eventId = await mustCreateEvent(owner, org);
  await mustSetEventStatus(owner, org, eventId, "published");
  await mustSetEventStatus(owner, org, eventId, "archived");

  const res = await createOccurrence(owner, org, eventId, {});
  assert.equal(res.statusCode, 409);
  assert.equal(
    problemSchema.parse(res.json()).type,
    "/problems/event-archived",
  );
});

test("list is in calendar order and 404 for an unknown event", async () => {
  const eventId = await mustCreateEvent(owner, org);
  const later = await mustCreateOccurrence(eventId, {
    startsAt: "2026-12-03T20:00:00Z",
  });
  const earlier = await mustCreateOccurrence(eventId, {
    startsAt: "2026-12-02T20:00:00Z",
  });

  const res = await app.inject({
    method: "GET",
    url: base(org, eventId),
    headers: { cookie: staff.cookie },
  });
  assert.equal(res.statusCode, 200);
  const ids = occurrencesResponseSchema.parse(res.json()).map((o) => o.id);
  assert.deepEqual(ids, [earlier.id, later.id]);

  const missing = await app.inject({
    method: "GET",
    url: base(org, randomUUID()),
    headers: { cookie: owner.cookie },
  });
  assert.equal(missing.statusCode, 404);
  assert.equal(
    problemSchema.parse(missing.json()).type,
    "/problems/event-not-found",
  );
});

test("staff reads but cannot create or change status", async () => {
  const eventId = await mustCreateEvent(owner, org);
  const occurrence = await mustCreateOccurrence(eventId);

  const read = await app.inject({
    method: "GET",
    url: `${base(org, eventId)}/${occurrence.id}`,
    headers: { cookie: staff.cookie },
  });
  assert.equal(read.statusCode, 200);

  const create = await createOccurrence(staff, org, eventId, {});
  assert.equal(create.statusCode, 403);

  const change = await setStatus(
    staff,
    org,
    eventId,
    occurrence.id,
    "cancelled",
  );
  assert.equal(change.statusCode, 403);
});

test("on_sale needs a published event; then draft ↔ on_sale and cancel work", async () => {
  const eventId = await mustCreateEvent(owner, org);
  const occurrence = await mustCreateOccurrence(eventId);

  const early = await setStatus(owner, org, eventId, occurrence.id, "on_sale");
  assert.equal(early.statusCode, 409);
  assert.equal(
    problemSchema.parse(early.json()).type,
    "/problems/event-not-published",
  );

  await mustSetEventStatus(owner, org, eventId, "published");

  for (const status of ["on_sale", "draft", "on_sale", "cancelled"] as const) {
    const res = await setStatus(owner, org, eventId, occurrence.id, status);
    assert.equal(res.statusCode, 200, `moving to ${status}`);
    assert.equal(occurrenceSchema.parse(res.json()).status, status);
  }

  // Cancelled is final.
  const revive = await setStatus(owner, org, eventId, occurrence.id, "draft");
  assert.equal(revive.statusCode, 409);
  assert.equal(
    problemSchema.parse(revive.json()).type,
    "/problems/invalid-transition",
  );
});

test("system-owned statuses cannot be set by hand", async () => {
  const eventId = await mustCreateEvent(owner, org);
  const occurrence = await mustCreateOccurrence(eventId);

  for (const status of ["sold_out", "ended"] as const) {
    const res = await setStatus(owner, org, eventId, occurrence.id, status);
    assert.equal(res.statusCode, 409, status);
  }
});

test("an occurrence is not reachable through another event or organization", async () => {
  const eventId = await mustCreateEvent(owner, org);
  const occurrence = await mustCreateOccurrence(eventId);
  const otherEvent = await mustCreateEvent(owner, org);
  const theirEvent = await mustCreateEvent(outsider, otherOrg);

  // Right organization, wrong event: the three-id WHERE misses.
  const wrongEvent = await app.inject({
    method: "GET",
    url: `${base(org, otherEvent)}/${occurrence.id}`,
    headers: { cookie: owner.cookie },
  });
  assert.equal(wrongEvent.statusCode, 404);
  assert.equal(
    problemSchema.parse(wrongEvent.json()).type,
    "/problems/occurrence-not-found",
  );

  // Another organization's owner, with their own event id in the path.
  const crossTenant = await setStatus(
    outsider,
    otherOrg,
    theirEvent,
    occurrence.id,
    "cancelled",
  );
  assert.equal(crossTenant.statusCode, 404);

  const check = await app.inject({
    method: "GET",
    url: `${base(org, eventId)}/${occurrence.id}`,
    headers: { cookie: owner.cookie },
  });
  assert.equal(occurrenceSchema.parse(check.json()).status, "draft");
});
