import type {
  CreateSpaceLayoutInput,
  CreateSpaceLayoutResponse,
  SpaceLayout,
  SpaceLayoutVersion,
  SpaceLayoutsResponse,
  SpaceLayoutVersionResponse,
} from "@ticketing/contracts";
import {
  isForeignKeyViolation,
  spaceLayouts,
  spaceLayoutVersions,
  spaces,
  type Db,
} from "@ticketing/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getSpace } from "../spaces/service.ts";
import { NotFoundError } from "../errors.ts";

const layoutColumns = {
  id: spaceLayouts.id,
  organizationId: spaceLayouts.organizationId,
  spaceId: spaceLayouts.spaceId,
  name: spaceLayouts.name,
} satisfies Record<keyof SpaceLayout, unknown>;

const versionColumns = {
  id: spaceLayoutVersions.id,
  organizationId: spaceLayoutVersions.organizationId,
  layoutId: spaceLayoutVersions.layoutId,
  version: spaceLayoutVersions.version,
  status: spaceLayoutVersions.status,
  width: spaceLayoutVersions.width,
  height: spaceLayoutVersions.height,
} satisfies Record<keyof SpaceLayoutVersion, unknown>;

export async function getSpaceLayoutVersion(
  db: Db,
  params: {
    organizationId: string;
    venueId: string;
    spaceId: string;
    layoutId: string;
    versionId: string;
  },
): Promise<SpaceLayoutVersionResponse | null> {
  const [row] = await db
    .select({ layout: layoutColumns, version: versionColumns })
    .from(spaceLayoutVersions)
    .innerJoin(
      spaceLayouts,
      and(
        eq(spaceLayouts.id, spaceLayoutVersions.layoutId),
        eq(spaceLayouts.organizationId, spaceLayoutVersions.organizationId),
      ),
    )
    .innerJoin(
      spaces,
      and(
        eq(spaces.id, spaceLayouts.spaceId),
        eq(spaces.organizationId, spaceLayouts.organizationId),
      ),
    )
    .where(
      and(
        eq(spaceLayoutVersions.id, params.versionId),
        eq(spaceLayouts.id, params.layoutId),
        eq(spaceLayouts.organizationId, params.organizationId),
        eq(spaces.id, params.spaceId),
        eq(spaces.venueId, params.venueId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listSpaceLayouts(
  db: Db,
  params: { organizationId: string; venueId: string; spaceId: string },
): Promise<SpaceLayoutsResponse> {
  const space = await getSpace(db, params);
  if (!space) throw new NotFoundError("space-not-found", "Space not found");

  function versionSummary(status: "draft" | "published") {
    return db
      .select({
        id: spaceLayoutVersions.id,
        version: spaceLayoutVersions.version,
      })
      .from(spaceLayoutVersions)
      .where(
        and(
          eq(spaceLayoutVersions.organizationId, spaceLayouts.organizationId),
          eq(spaceLayoutVersions.layoutId, spaceLayouts.id),
          eq(spaceLayoutVersions.status, status),
        ),
      )
      .orderBy(desc(spaceLayoutVersions.version))
      .limit(1);
  }

  const draft = versionSummary("draft").as("draft_version");
  const published = versionSummary("published").as("published_version");

  return await db
    .select({
      ...layoutColumns,
      draftVersion: { id: draft.id, version: draft.version },
      latestPublishedVersion: { id: published.id, version: published.version },
    })
    .from(spaceLayouts)
    .leftJoinLateral(draft, sql`true`)
    .leftJoinLateral(published, sql`true`)
    .where(
      and(
        eq(spaceLayouts.organizationId, params.organizationId),
        eq(spaceLayouts.spaceId, params.spaceId),
      ),
    )
    .orderBy(asc(spaceLayouts.name), asc(spaceLayouts.id));
}

export async function createSpaceLayout(
  db: Db,
  input: CreateSpaceLayoutInput & {
    organizationId: string;
    venueId: string;
    spaceId: string;
  },
): Promise<CreateSpaceLayoutResponse> {
  const space = await getSpace(db, {
    organizationId: input.organizationId,
    venueId: input.venueId,
    spaceId: input.spaceId,
  });

  if (!space) throw new NotFoundError("space-not-found", "Space not found");

  try {
    return await db.transaction(async (tx) => {
      const [insertedSpaceLayout] = await tx
        .insert(spaceLayouts)
        .values({
          organizationId: input.organizationId,
          spaceId: input.spaceId,
          name: input.name,
        })
        .returning(layoutColumns);

      if (!insertedSpaceLayout)
        throw new Error("spaceLayout: insert returned no row");

      const [insertedSpaceLayoutVersion] = await tx
        .insert(spaceLayoutVersions)
        .values({
          organizationId: input.organizationId,
          layoutId: insertedSpaceLayout.id,
          version: 1,
          status: "draft",
          width: input.width,
          height: input.height,
        })
        .returning(versionColumns);

      if (!insertedSpaceLayoutVersion)
        throw new Error("spaceLayoutVersions: insert returned no row");

      return {
        layout: insertedSpaceLayout,
        version: insertedSpaceLayoutVersion,
      };
    });
  } catch (err) {
    // The space may disappear between the lookup and the insert.
    if (isForeignKeyViolation(err, "space_layouts_space_fk")) {
      throw new NotFoundError("space-not-found", "Space not found");
    }
    throw err;
  }
}
