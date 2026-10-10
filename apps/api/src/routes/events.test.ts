import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  eventSchema,
  eventsResponseSchema,
  problemSchema,
  type EventStatus,
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

function createEvent(
  as: Actor,
  organizationId: string,
  payload: Record<string, unknown>,
) {
  return app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/events`,
    headers: { cookie: as.cookie },
    payload,
  });
}

// Create and insist it worked; for setup, not for the assertion under test.
async function mustCreateEvent(
  as: Actor,
  organizationId: string,
  title: string,
) {
  const res = await createEvent(as, organizationId, { title });
  assert.equal(res.statusCode, 201);
  return eventSchema.parse(res.json());
}

function setStatus(
  as: Actor,
  organizationId: string,
  eventId: string,
  status: EventStatus,
) {
  return app.inject({
    method: "PATCH",
    url: `/organizations/${organizationId}/events/${eventId}/status`,
    headers: { cookie: as.cookie },
    payload: { status },
  });
}

test("owner creates an event; it starts as draft with a slug from the title", async () => {
  const res = await createEvent(owner, org, {
    title: "Hamlet: Yeni Yorum",
    description: "  Modern sahneleme  ",
  });
  assert.equal(res.statusCode, 201);
  const event = eventSchema.parse(res.json());
  assert.equal(event.organizationId, org);
  assert.equal(event.slug, "hamlet-yeni-yorum");
  assert.equal(event.status, "draft");
  assert.equal(event.description, "Modern sahneleme");
});

test("description is optional and comes back as null", async () => {
  const event = await mustCreateEvent(
    owner,
    org,
    `Sade ${randomUUID().slice(0, 6)}`,
  );
  assert.equal(event.description, null);
});

test("same title twice in one organization gets a numbered slug", async () => {
  const title = `Tekrar ${randomUUID().slice(0, 6)}`;
  const first = await mustCreateEvent(owner, org, title);
  const second = await mustCreateEvent(owner, org, title);
  assert.equal(second.slug, `${first.slug}-2`);
});

test("list is newest first and scoped to the organization", async () => {
  const older = await mustCreateEvent(
    owner,
    org,
    `Eski ${randomUUID().slice(0, 6)}`,
  );
  const newer = await mustCreateEvent(
    owner,
    org,
    `Yeni ${randomUUID().slice(0, 6)}`,
  );

  const res = await app.inject({
    method: "GET",
    url: `/organizations/${org}/events`,
    headers: { cookie: owner.cookie },
  });
  assert.equal(res.statusCode, 200);
  const events = eventsResponseSchema.parse(res.json());
  const ids = events.map((e) => e.id);
  assert.ok(ids.indexOf(newer.id) < ids.indexOf(older.id));
  assert.ok(events.every((e) => e.organizationId === org));
});

test("staff can list and read events but not create or publish them", async () => {
  const event = await mustCreateEvent(owner, org, "Staff Görür");

  const list = await app.inject({
    method: "GET",
    url: `/organizations/${org}/events`,
    headers: { cookie: staff.cookie },
  });
  assert.equal(list.statusCode, 200);

  const one = await app.inject({
    method: "GET",
    url: `/organizations/${org}/events/${event.id}`,
    headers: { cookie: staff.cookie },
  });
  assert.equal(one.statusCode, 200);

  const create = await createEvent(staff, org, { title: "Staff Yazamaz" });
  assert.equal(create.statusCode, 403);

  const publish = await setStatus(staff, org, event.id, "published");
  assert.equal(publish.statusCode, 403);
});

test("status walks draft → published → draft → published → archived", async () => {
  const event = await mustCreateEvent(owner, org, "Yolculuk");

  for (const status of [
    "published",
    "draft",
    "published",
    "archived",
  ] as const) {
    const res = await setStatus(owner, org, event.id, status);
    assert.equal(res.statusCode, 200, `moving to ${status}`);
    assert.equal(eventSchema.parse(res.json()).status, status);
  }
});

test("forbidden transitions answer 409 invalid-transition", async () => {
  const event = await mustCreateEvent(owner, org, "Kısa Yol");

  // draft → archived skips publishing.
  const skip = await setStatus(owner, org, event.id, "archived");
  assert.equal(skip.statusCode, 409);
  assert.equal(
    problemSchema.parse(skip.json()).type,
    "/problems/invalid-transition",
  );

  // Same status again is not a no-op; the client sent something stale.
  const same = await setStatus(owner, org, event.id, "draft");
  assert.equal(same.statusCode, 409);

  // Archive is final.
  await setStatus(owner, org, event.id, "published");
  await setStatus(owner, org, event.id, "archived");
  const revive = await setStatus(owner, org, event.id, "draft");
  assert.equal(revive.statusCode, 409);
});

test("unknown status value is a validation error, not a transition error", async () => {
  const event = await mustCreateEvent(owner, org, "Yanlış Durum");
  const res = await app.inject({
    method: "PATCH",
    url: `/organizations/${org}/events/${event.id}/status`,
    headers: { cookie: owner.cookie },
    payload: { status: "live" },
  });
  assert.equal(res.statusCode, 400);
});

test("another organization's event reads and updates as not found", async () => {
  const theirs = await mustCreateEvent(outsider, otherOrg, "Onların Etkinliği");

  const read = await app.inject({
    method: "GET",
    url: `/organizations/${org}/events/${theirs.id}`,
    headers: { cookie: owner.cookie },
  });
  assert.equal(read.statusCode, 404);
  assert.equal(
    problemSchema.parse(read.json()).type,
    "/problems/event-not-found",
  );

  const update = await setStatus(owner, org, theirs.id, "published");
  assert.equal(update.statusCode, 404);
  // Ground truth: the other organization's event is untouched.
  const check = await app.inject({
    method: "GET",
    url: `/organizations/${otherOrg}/events/${theirs.id}`,
    headers: { cookie: outsider.cookie },
  });
  assert.equal(eventSchema.parse(check.json()).status, "draft");
});
