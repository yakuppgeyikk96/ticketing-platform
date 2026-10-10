import {
  slugify,
  type CreateVenueInput,
  type Venue,
} from "@ticketing/contracts";
import { isUniqueViolation, venues, type Db } from "@ticketing/db";
import { BadRequestError, ConflictError } from "../errors.ts";
import { and, asc, eq, like, or } from "drizzle-orm";
import { pickFreeSlug } from "../lib/slug.ts";

const venueColumns = {
  id: venues.id,
  organizationId: venues.organizationId,
  name: venues.name,
  slug: venues.slug,
  address: venues.address,
  city: venues.city,
  timezone: venues.timezone,
  capacity: venues.capacity,
} satisfies Record<keyof Venue, unknown>;

export async function createVenue(
  db: Db,
  input: CreateVenueInput & { organizationId: string },
): Promise<Venue> {
  const base = slugify(input.name);

  if (!base) {
    throw new BadRequestError(
      "invalid-name",
      "Venue name must contain letters or digits",
    );
  }

  const slug = await findFreeSlug(db, base, input.organizationId);

  try {
    const [row] = await db
      .insert(venues)
      .values({
        organizationId: input.organizationId,
        name: input.name,
        slug,
        address: input.address ?? null,
        city: input.city ?? null,
        timezone: input.timezone,
        capacity: input.capacity ?? null,
      })
      .returning(venueColumns);

    if (!row) throw new Error("insert return no row");

    return row;
  } catch (err) {
    if (isUniqueViolation(err, "venues_organization_id_slug_key")) {
      throw new ConflictError(
        "slug-taken",
        "Venue slug already taken",
        "Try again",
      );
    }
    throw err;
  }
}

export async function listVenues(
  db: Db,
  organizationId: string,
): Promise<Venue[]> {
  return await db
    .select(venueColumns)
    .from(venues)
    .where(eq(venues.organizationId, organizationId))
    .orderBy(asc(venues.name));
}

export async function getVenue(
  db: Db,
  params: { organizationId: string; venueId: string },
): Promise<Venue | null> {
  const [row] = await db
    .select(venueColumns)
    .from(venues)
    .where(
      and(
        eq(venues.id, params.venueId),
        eq(venues.organizationId, params.organizationId),
      ),
    );

  return row ?? null;
}

export async function findFreeSlug(
  db: Db,
  base: string,
  organizationId: string,
): Promise<string> {
  const rows = await db
    .select({ slug: venues.slug })
    .from(venues)
    .where(
      and(
        eq(venues.organizationId, organizationId),
        or(eq(venues.slug, base), like(venues.slug, base + "-%")),
      ),
    );

  const taken = new Set(rows.map((r) => r.slug));

  return pickFreeSlug(base, taken);
}
