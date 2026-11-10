import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  createSpaceLayoutResponseSchema,
  problemSchema,
  spaceLayoutsResponseSchema,
  spaceLayoutVersionResponseSchema,
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

function list(
  actor: Actor | null,
  params: { organizationId?: string; venueId?: string; spaceId?: string } = {},
) {
  return app.inject({
    method: "GET",
    url: `/organizations/${params.organizationId ?? org}/venues/${params.venueId ?? venueId}/spaces/${params.spaceId ?? spaceId}/layouts`,
    headers: actor ? { cookie: actor.cookie } : {},
  });
}

function detail(
  actor: Actor | null,
  layoutId: string,
  versionId: string,
  params: { organizationId?: string; venueId?: string; spaceId?: string } = {},
) {
  return app.inject({
    method: "GET",
    url: `/organizations/${params.organizationId ?? org}/venues/${params.venueId ?? venueId}/spaces/${params.spaceId ?? spaceId}/layouts/${layoutId}/versions/${versionId}`,
    headers: actor ? { cookie: actor.cookie } : {},
  });
}

test("owner, admin and staff read version details in every lifecycle status", async () => {
  const created = await create(owner);
  assert.equal(created.statusCode, 201);
  const expected = createSpaceLayoutResponseSchema.parse(created.json());
  for (const status of ["draft", "published", "archived"] as const) {
    await app.db
      .update(spaceLayoutVersions)
      .set({ status })
      .where(eq(spaceLayoutVersions.id, expected.version.id));
    for (const actor of [owner, admin, staff]) {
      const res = await detail(actor, expected.layout.id, expected.version.id);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(spaceLayoutVersionResponseSchema.parse(res.json()), {
        layout: expected.layout,
        version: { ...expected.version, status },
      });
    }
  }
});

test("version detail requires a session and hides another organization's data", async () => {
  const created = await create(owner);
  assert.equal(created.statusCode, 201);
  const { layout, version } = createSpaceLayoutResponseSchema.parse(
    created.json(),
  );
  const anonymous = await detail(null, layout.id, version.id);
  assert.equal(anonymous.statusCode, 401);
  problemSchema.parse(anonymous.json());
  const res = await detail(outsider, layout.id, version.id);
  assert.equal(res.statusCode, 404);
  assert.equal(
    problemSchema.parse(res.json()).type,
    "/problems/organization-not-found",
  );
});

test("version detail rejects missing and mismatched path relationships", async () => {
  const first = await create(owner);
  const second = await create(owner);
  assert.equal(first.statusCode, 201);
  assert.equal(second.statusCode, 201);
  const { layout, version } = createSpaceLayoutResponseSchema.parse(
    first.json(),
  );
  const other = createSpaceLayoutResponseSchema.parse(second.json());
  const responses = [
    await detail(owner, randomUUID(), version.id),
    await detail(owner, layout.id, randomUUID()),
    await detail(owner, other.layout.id, version.id),
    await detail(owner, layout.id, version.id, { spaceId: otherSpaceId }),
    await detail(owner, layout.id, version.id, { spaceId: randomUUID() }),
    await detail(owner, layout.id, version.id, { venueId: secondVenueId }),
  ];
  for (const res of responses) {
    assert.equal(res.statusCode, 404);
    assert.equal(
      problemSchema.parse(res.json()).type,
      "/problems/layout-version-not-found",
    );
  }
});

test("version detail validates every URL id", async () => {
  for (const field of [
    "organizationId",
    "venueId",
    "spaceId",
    "layoutId",
    "versionId",
  ] as const) {
    const ids = {
      organizationId: org,
      venueId,
      spaceId,
      layoutId: randomUUID(),
      versionId: randomUUID(),
      [field]: "invalid",
    };
    const res = await detail(owner, ids.layoutId, ids.versionId, ids);
    assert.equal(res.statusCode, 400);
    assert.ok(
      problemSchema
        .parse(res.json())
        .errors?.some((error) => error.field === field),
    );
  }
});

test("owner, admin and staff list only the selected space's layouts with version summaries", async () => {
  const location = await createLocation(owner, org);
  const first = await create(owner, location, { name: "B".repeat(2) });
  const second = await create(owner, location, { name: "A".repeat(2) });
  assert.equal(first.statusCode, 201);
  assert.equal(second.statusCode, 201);
  const b = createSpaceLayoutResponseSchema.parse(first.json());
  const a = createSpaceLayoutResponseSchema.parse(second.json());
  await app.db
    .update(spaceLayoutVersions)
    .set({ status: "published" })
    .where(eq(spaceLayoutVersions.id, b.version.id));
  const [latest] = await app.db
    .insert(spaceLayoutVersions)
    .values({
      organizationId: org,
      layoutId: b.layout.id,
      version: 2,
      status: "published",
      width: 1200,
      height: 800,
    })
    .returning({ id: spaceLayoutVersions.id });
  assert.ok(latest);
  const [draft] = await app.db
    .insert(spaceLayoutVersions)
    .values({
      organizationId: org,
      layoutId: b.layout.id,
      version: 3,
      status: "draft",
      width: 1200,
      height: 800,
    })
    .returning({ id: spaceLayoutVersions.id });
  assert.ok(draft);
  await app.db.insert(spaceLayoutVersions).values({
    organizationId: org,
    layoutId: b.layout.id,
    version: 4,
    status: "archived",
    width: 1200,
    height: 800,
  });

  for (const actor of [owner, admin, staff]) {
    const res = await list(actor, location);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(spaceLayoutsResponseSchema.parse(res.json()), [
      {
        ...a.layout,
        draftVersion: { id: a.version.id, version: 1 },
        latestPublishedVersion: null,
      },
      {
        ...b.layout,
        draftVersion: { id: draft.id, version: 3 },
        latestPublishedVersion: { id: latest.id, version: 2 },
      },
    ]);
  }
});

test("an existing space without layouts returns an empty list", async () => {
  const location = await createLocation(owner, org);
  const res = await list(owner, location);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(spaceLayoutsResponseSchema.parse(res.json()), []);
});

test("layout listing requires a session and hides other organizations", async () => {
  const anonymous = await list(null);
  assert.equal(anonymous.statusCode, 401);
  problemSchema.parse(anonymous.json());
  const res = await list(outsider);
  assert.equal(res.statusCode, 404);
  assert.equal(
    problemSchema.parse(res.json()).type,
    "/problems/organization-not-found",
  );
});

test("listing rejects missing, wrong-venue and other-tenant spaces", async () => {
  for (const params of [
    { spaceId: randomUUID() },
    { venueId: secondVenueId },
    { venueId: randomUUID() },
    { spaceId: otherSpaceId },
  ]) {
    const res = await list(owner, params);
    assert.equal(res.statusCode, 404);
    assert.equal(
      problemSchema.parse(res.json()).type,
      "/problems/space-not-found",
    );
  }
});

test("listing validates all URL ids", async () => {
  for (const field of ["organizationId", "venueId", "spaceId"] as const) {
    const res = await list(owner, { [field]: "invalid" });
    assert.equal(res.statusCode, 400);
    assert.ok(
      problemSchema
        .parse(res.json())
        .errors?.some((error) => error.field === field),
    );
  }
});

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
