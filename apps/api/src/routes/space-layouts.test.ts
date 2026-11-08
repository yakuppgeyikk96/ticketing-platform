import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  createSpaceLayoutResponseSchema,
  problemSchema,
  spaceSchema,
  venueSchema,
} from "@ticketing/contracts";
import { spaceLayouts, spaceLayoutVersions } from "@ticketing/db";
import { eq } from "drizzle-orm";
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
let venueId: string;
let spaceId: string;
let secondVenueId: string;
let otherSpaceId: string;

async function createLocation(actor: Actor, organizationId: string) {
  const venue = await app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/venues`,
    headers: { cookie: actor.cookie },
    payload: { name: `Venue ${randomUUID()}`, timezone: "Europe/Istanbul" },
  });
  assert.equal(venue.statusCode, 201);
  const venueId = venueSchema.parse(venue.json()).id;
  const space = await app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/venues/${venueId}/spaces`,
    headers: { cookie: actor.cookie },
    payload: { name: "Ana alan" },
  });
  assert.equal(space.statusCode, 201);
  return { venueId, spaceId: spaceSchema.parse(space.json()).id };
}

before(async () => {
  app = await startApp();
  owner = await signUp(app);
  admin = await signUp(app);
  staff = await signUp(app);
  outsider = await signUp(app);
  org = await createOrg(app, owner);
  await mustAddMember(app, owner, org, admin, "admin");
  await mustAddMember(app, owner, org, staff, "staff");
  ({ venueId, spaceId } = await createLocation(owner, org));
  secondVenueId = (await createLocation(owner, org)).venueId;
  const otherOrg = await createOrg(app, outsider);
  otherSpaceId = (await createLocation(outsider, otherOrg)).spaceId;
});

after(() => app.close());

function create(
  actor: Actor | null,
  params: { organizationId?: string; venueId?: string; spaceId?: string } = {},
  body: Record<string, unknown> = {},
) {
  return app.inject({
    method: "POST",
    url: `/organizations/${params.organizationId ?? org}/venues/${params.venueId ?? venueId}/spaces/${params.spaceId ?? spaceId}/layouts`,
    headers: actor ? { cookie: actor.cookie } : {},
    payload: { name: "Tiyatro Düzeni", width: 1200, height: 800, ...body },
  });
}

test("owner and admin create a layout with a persisted first draft", async () => {
  for (const actor of [owner, admin]) {
    const res = await create(actor, {}, { name: "  Tiyatro Düzeni  " });
    assert.equal(res.statusCode, 201);
    const { layout, version } = createSpaceLayoutResponseSchema.parse(
      res.json(),
    );
    assert.equal(layout.name, "Tiyatro Düzeni");
    assert.equal(layout.organizationId, org);
    assert.equal(layout.spaceId, spaceId);
    assert.equal(version.organizationId, org);
    assert.equal(version.layoutId, layout.id);
    assert.equal(version.version, 1);
    assert.equal(version.status, "draft");
    assert.equal(version.width, 1200);
    assert.equal(version.height, 800);
    const layouts = await app.db
      .select()
      .from(spaceLayouts)
      .where(eq(spaceLayouts.id, layout.id));
    const versions = await app.db
      .select()
      .from(spaceLayoutVersions)
      .where(eq(spaceLayoutVersions.layoutId, layout.id));
    assert.equal(layouts.length, 1);
    assert.equal(versions.length, 1);
    assert.equal(versions[0]?.id, version.id);
  }
});

test("layout creation requires authentication and owner or admin role", async () => {
  for (const [actor, status] of [
    [null, 401],
    [staff, 403],
  ] as const) {
    const res = await create(actor);
    assert.equal(res.statusCode, status);
    problemSchema.parse(res.json());
  }
});

test("outsiders cannot create layouts through another organization", async () => {
  const res = await create(outsider);
  assert.equal(res.statusCode, 404);
  assert.equal(
    problemSchema.parse(res.json()).type,
    "/problems/organization-not-found",
  );
});

test("missing, wrong-venue and other-tenant spaces return the same 404", async () => {
  for (const params of [
    { spaceId: randomUUID() },
    { venueId: secondVenueId },
    { venueId: randomUUID() },
    { spaceId: otherSpaceId },
  ]) {
    const res = await create(owner, params);
    assert.equal(res.statusCode, 404);
    assert.equal(
      problemSchema.parse(res.json()).type,
      "/problems/space-not-found",
    );
  }
});

test("invalid body fields return validation errors without creating a layout", async () => {
  for (const [field, value] of [
    ["name", " "],
    ["name", "x"],
    ["name", "x".repeat(201)],
    ["width", 0],
    ["width", -1],
    ["width", 1.5],
    ["width", 2_147_483_648],
    ["height", 0],
    ["height", "800"],
    ["height", null],
  ] as const) {
    const name = `Invalid ${randomUUID()}`;
    const res = await create(owner, {}, { name, [field]: value });
    assert.equal(res.statusCode, 400, `${field}: ${value}`);
    assert.ok(
      problemSchema
        .parse(res.json())
        .errors?.some((error) => error.field === field),
    );
    const rows = await app.db
      .select()
      .from(spaceLayouts)
      .where(eq(spaceLayouts.name, field === "name" ? value : name));
    assert.equal(rows.length, 0);
  }
});

test("all URL ids must be valid UUIDs", async () => {
  for (const field of ["organizationId", "venueId", "spaceId"] as const) {
    const res = await create(owner, { [field]: "invalid" });
    assert.equal(res.statusCode, 400);
    assert.ok(
      problemSchema
        .parse(res.json())
        .errors?.some((error) => error.field === field),
    );
  }
});
