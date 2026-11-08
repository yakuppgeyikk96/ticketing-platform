import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  createSpaceLayoutResponseSchema,
  spaceLayoutsResponseSchema,
} from "@ticketing/contracts";
import {
  spaces,
  venues,
  spaceLayouts,
  spaceLayoutVersions,
} from "@ticketing/db";
import { eq } from "drizzle-orm";
import {
  createOrg,
  signUp,
  startApp,
  type TestApp,
} from "../testing/harness.ts";
import { createSpaceLayout, listSpaceLayouts } from "./service.ts";

let app: TestApp;
let organizationId: string;
let venueId: string;
let spaceId: string;

before(async () => {
  app = await startApp();
  organizationId = await createOrg(app, await signUp(app));
  const [venue] = await app.db
    .insert(venues)
    .values({
      organizationId,
      name: "Test venue",
      slug: randomUUID(),
      timezone: "Europe/Istanbul",
    })
    .returning({ id: venues.id });
  assert.ok(venue);
  venueId = venue.id;
  const [space] = await app.db
    .insert(spaces)
    .values({
      organizationId,
      venueId,
      name: "Test space",
      slug: "test-space",
    })
    .returning({ id: spaces.id });
  assert.ok(space);
  spaceId = space.id;
});

after(() => app.close());

test("lists only the selected space with draft and latest published summaries", async () => {
  const [space] = await app.db
    .insert(spaces)
    .values({
      organizationId,
      venueId,
      name: "List test",
      slug: randomUUID(),
    })
    .returning({ id: spaces.id });
  assert.ok(space);
  const params = { organizationId, venueId, spaceId: space.id };
  assert.deepEqual(await listSpaceLayouts(app.db, params), []);
  const b = await createSpaceLayout(app.db, {
    ...params,
    name: "B",
    width: 1200,
    height: 800,
  });
  const a = await createSpaceLayout(app.db, {
    ...params,
    name: "A",
    width: 1200,
    height: 800,
  });
  await app.db
    .update(spaceLayoutVersions)
    .set({ status: "published" })
    .where(eq(spaceLayoutVersions.id, b.version.id));
  const published = await app.db
    .insert(spaceLayoutVersions)
    .values({
      organizationId,
      layoutId: b.layout.id,
      version: 2,
      status: "published",
      width: 1200,
      height: 800,
    })
    .returning({ id: spaceLayoutVersions.id });
  assert.ok(published[0]);
  await app.db.insert(spaceLayoutVersions).values({
    organizationId,
    layoutId: b.layout.id,
    version: 3,
    status: "archived",
    width: 1200,
    height: 800,
  });
  const result = spaceLayoutsResponseSchema.parse(
    await listSpaceLayouts(app.db, params),
  );
  assert.deepEqual(
    result.map((layout) => layout.id),
    [a.layout.id, b.layout.id],
  );
  assert.deepEqual(result[0]?.draftVersion, { id: a.version.id, version: 1 });
  assert.equal(result[0]?.latestPublishedVersion, null);
  assert.equal(result[1]?.draftVersion, null);
  assert.deepEqual(result[1]?.latestPublishedVersion, {
    id: published[0].id,
    version: 2,
  });
});

test("listing rejects missing spaces and mismatched venue or organization", async () => {
  for (const override of [
    { spaceId: randomUUID() },
    { venueId: randomUUID() },
    { organizationId: randomUUID() },
  ]) {
    await assert.rejects(
      listSpaceLayouts(app.db, {
        organizationId,
        venueId,
        spaceId,
        ...override,
      }),
      { message: "Space not found" },
    );
  }
});

test("creates a layout and its first draft version", async () => {
  const result = createSpaceLayoutResponseSchema.parse(
    await createSpaceLayout(app.db, {
      organizationId,
      venueId,
      spaceId,
      name: "Tiyatro",
      width: 1200,
      height: 800,
    }),
  );
  assert.equal(result.layout.spaceId, spaceId);
  assert.equal(result.layout.organizationId, organizationId);
  assert.equal(result.layout.name, "Tiyatro");
  assert.equal(result.version.layoutId, result.layout.id);
  assert.equal(result.version.organizationId, organizationId);
  assert.equal(result.version.version, 1);
  assert.equal(result.version.status, "draft");
  assert.equal(result.version.width, 1200);
  assert.equal(result.version.height, 800);
  const versions = await app.db
    .select()
    .from(spaceLayoutVersions)
    .where(eq(spaceLayoutVersions.layoutId, result.layout.id));
  assert.equal(versions.length, 1);
});

test("rejects missing spaces and mismatched venue or organization", async () => {
  for (const override of [
    { spaceId: randomUUID() },
    { venueId: randomUUID() },
    { organizationId: randomUUID() },
  ]) {
    await assert.rejects(
      createSpaceLayout(app.db, {
        organizationId,
        venueId,
        spaceId,
        name: "Tiyatro",
        width: 1200,
        height: 800,
        ...override,
      }),
      { message: "Space not found" },
    );
  }
});

test("rolls back the layout if the initial version insert fails", async () => {
  const name = `Rollback ${randomUUID()}`;
  // Bypass route validation to provoke the database dimension constraint.
  await assert.rejects(
    createSpaceLayout(app.db, {
      organizationId,
      venueId,
      spaceId,
      name,
      width: 0,
      height: 800,
    }),
  );
  const rows = await app.db
    .select()
    .from(spaceLayouts)
    .where(eq(spaceLayouts.name, name));
  assert.equal(rows.length, 0);
});
