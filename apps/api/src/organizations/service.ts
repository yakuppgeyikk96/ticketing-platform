import { slugify } from "@ticketing/contracts";
import {
  isUniqueViolation,
  organizationMembers,
  organizations,
  type Db,
} from "@ticketing/db";
import { eq, like, or } from "drizzle-orm";
import { BadRequestError, ConflictError } from "../errors.ts";

interface CreateOrganizationReturn {
  id: string;
  name: string;
  slug: string;
}

export async function findFreeSlug(db: Db, base: string): Promise<string> {
  const rows = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(
      or(eq(organizations.slug, base), like(organizations.slug, base + "-%")),
    );

  const taken = new Set(rows.map((r) => r.slug));

  if (!taken.has(base)) return base;

  let n = 2;

  while (taken.has(`${base}-${n}`)) n++;

  return `${base}-${n}`;
}

export async function createOrganization(
  db: Db,
  input: { name: string; ownerId: string },
): Promise<CreateOrganizationReturn> {
  const base = slugify(input.name);

  if (!base) {
    throw new BadRequestError(
      "invalid-name",
      "Organization name must contain letters or digits",
    );
  }

  const slug = await findFreeSlug(db, base);

  try {
    return await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({ name: input.name, slug })
        .returning({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
        });

      if (!org) throw new Error("insert return no row");

      await tx.insert(organizationMembers).values({
        userId: input.ownerId,
        organizationId: org.id,
        role: "owner",
      });

      return org;
    });
  } catch (err) {
    if (isUniqueViolation(err, "organizations_slug_unique")) {
      throw new ConflictError(
        "slug-taken",
        "Organization slug already taken",
        "Try again",
      );
    }
    throw err;
  }
}
