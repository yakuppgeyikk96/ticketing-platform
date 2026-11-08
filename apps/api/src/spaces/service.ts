import {
  slugify,
  type CreateSpaceInput,
  type Space,
} from "@ticketing/contracts";
import {
  isForeignKeyViolation,
  isUniqueViolation,
  spaces,
  type Db,
} from "@ticketing/db";
import { and, asc, eq, or, like } from "drizzle-orm";
import { getVenue } from "../venues/service.ts";
import { BadRequestError, ConflictError, NotFoundError } from "../errors.ts";
import { pickFreeSlug } from "../lib/slug.ts";

const spaceColumns = {
  id: spaces.id,
  organizationId: spaces.organizationId,
  venueId: spaces.venueId,
  name: spaces.name,
  slug: spaces.slug,
  description: spaces.description,
  capacity: spaces.capacity,
} satisfies Record<keyof Space, unknown>;

export async function listSpaces(
  db: Db,
  params: { organizationId: string; venueId: string },
): Promise<Space[]> {
  return await db
    .select(spaceColumns)
    .from(spaces)
    .where(
      and(
        eq(spaces.organizationId, params.organizationId),
        eq(spaces.venueId, params.venueId),
      ),
    )
    .orderBy(asc(spaces.name), asc(spaces.id));
}

export async function getSpace(
  db: Db,
  params: { organizationId: string; venueId: string; spaceId: string },
): Promise<Space | null> {
  const [row] = await db
    .select()
    .from(spaces)
    .where(
      and(
        eq(spaces.organizationId, params.organizationId),
        eq(spaces.venueId, params.venueId),
        eq(spaces.id, params.spaceId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function createSpace(
  db: Db,
  input: CreateSpaceInput & { organizationId: string; venueId: string },
): Promise<Space> {
  const { organizationId, venueId, name: spaceName } = input;
  const venue = await getVenue(db, { organizationId, venueId });

  if (!venue) {
    throw new NotFoundError("venue-not-found", "Venue not found");
  }

  const baseSlug = slugify(spaceName);

  if (!baseSlug) {
    throw new BadRequestError(
      "invalid-name",
      "Space name must contain letters or digits",
    );
  }

  const slug = await findFreeSlug(db, baseSlug, input.venueId);

  try {
    const [row] = await db
      .insert(spaces)
      .values({
        organizationId,
        venueId,
        name: spaceName,
        slug,
        description: input.description ?? null,
        capacity: input.capacity ?? null,
      })
      .returning(spaceColumns);

    if (!row) throw new Error("insert returned no row");

    return row;
  } catch (err) {
    if (isUniqueViolation(err, "spaces_venue_id_slug_key")) {
      throw new ConflictError(
        "slug-taken",
        "Space slug already taken",
        "Try again",
      );
    }
    // The venue may disappear after the initial lookup.
    if (isForeignKeyViolation(err, "spaces_venue_fk")) {
      throw new NotFoundError("venue-not-found", "Venue not found");
    }
    throw err;
  }
}

export async function findFreeSlug(
  db: Db,
  base: string,
  venueId: string,
): Promise<string> {
  const rows = await db
    .select({ slug: spaces.slug })
    .from(spaces)
    .where(
      and(
        eq(spaces.venueId, venueId),
        or(eq(spaces.slug, base), like(spaces.slug, base + "-%")),
      ),
    );

  const taken = new Set(rows.map((r) => r.slug));

  return pickFreeSlug(base, taken);
}
