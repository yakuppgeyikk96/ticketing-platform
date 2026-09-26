import { slugify } from "@ticketing/contracts";
import {
  isUniqueViolation,
  organizationMembers,
  organizations,
  users,
  type Db,
} from "@ticketing/db";
import { and, asc, eq, isNull, like, or, sql } from "drizzle-orm";
import { BadRequestError, ConflictError, NotFoundError } from "../errors.ts";

export type MemberRole = (typeof organizationMembers.$inferSelect)["role"];

interface CreateOrganizationReturn {
  id: string;
  name: string;
  slug: string;
}

interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  role: MemberRole;
}

interface AddMemberInput {
  organizationId: string;
  email: string;
  role: MemberRole;
}

interface AddMemberReturn {
  userId: string;
  email: string;
  role: MemberRole;
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

export async function addMember(
  db: Db,
  input: AddMemberInput,
): Promise<AddMemberReturn> {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(sql`lower(${users.email}) = ${input.email}`, isNull(users.deletedAt)),
    );

  if (!user)
    throw new NotFoundError("user-not-found", "No account with this email");

  try {
    const [insertedMembership] = await db
      .insert(organizationMembers)
      .values({
        userId: user.id,
        organizationId: input.organizationId,
        role: input.role,
      })
      .returning({
        userId: organizationMembers.userId,
        role: organizationMembers.role,
      });

    if (!insertedMembership) throw new Error("error adding membership");

    return {
      userId: insertedMembership.userId,
      email: input.email,
      role: insertedMembership.role,
    };
  } catch (err) {
    if (
      isUniqueViolation(err, "organization_members_user_id_organization_id_pk")
    ) {
      throw new ConflictError(
        "already-member",
        "User is already a member of organization",
      );
    }
    throw err;
  }
}

export async function listUserOrganizations(
  db: Db,
  userId: string,
): Promise<UserOrganization[]> {
  return await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, userId))
    .orderBy(asc(organizations.name));
}

export async function findMembership(
  db: Db,
  params: { userId: string; organizationId: string },
): Promise<{ role: MemberRole } | null> {
  const [row] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, params.userId),
        eq(organizationMembers.organizationId, params.organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
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
