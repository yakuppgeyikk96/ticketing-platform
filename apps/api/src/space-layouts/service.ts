import type {
  CreateSpaceLayoutInput,
  CreateSpaceLayoutResponse,
  SpaceLayout,
  SpaceLayoutVersion,
} from "@ticketing/contracts";
import {
  isForeignKeyViolation,
  spaceLayouts,
  spaceLayoutVersions,
  type Db,
} from "@ticketing/db";
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
