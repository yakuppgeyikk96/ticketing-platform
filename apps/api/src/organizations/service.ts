import { slugify } from "@ticketing/contracts";
import {
  isUniqueViolation,
  organizationMembers,
  organizations,
  users,
  type Db,
} from "@ticketing/db";
import { and, asc, count, eq, isNull, like, or, sql } from "drizzle-orm";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors.ts";

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

interface RemoveMemberInput {
  organizationId: string;
  // Who is asking. Re-checked inside the transaction: the hook's answer predates the lock.
  actorId: string;
  userId: string;
}

export async function removeMember(
  db: Db,
  input: RemoveMemberInput,
): Promise<void> {
  // Product rule, not a data rule: no query needed, so it stays outside the transaction.
  if (input.actorId === input.userId) {
    throw new ConflictError(
      "cannot-remove-self",
      "You cannot remove yourself",
      "Ask another owner to remove you",
    );
  }

  await db.transaction(async (tx) => {
    // The organization row is the gate for every change to its membership set.
    // FOR UPDATE makes a concurrent remove wait here until this transaction
    // commits, so its owner count below always sees our delete.
    const [org] = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, input.organizationId))
      .for("update");

    if (!org) {
      throw new NotFoundError(
        "organization-not-found",
        "Organization not found",
      );
    }

    const actor = await findMembership(tx, {
      userId: input.actorId,
      organizationId: input.organizationId,
    });

    if (actor?.role !== "owner") {
      throw new ForbiddenError("insufficient-role", "You need one of: owner");
    }

    const target = await findMembership(tx, {
      userId: input.userId,
      organizationId: input.organizationId,
    });

    if (!target) {
      throw new NotFoundError(
        "member-not-found",
        "User is not a member of this organization",
      );
    }

    // Unreachable today: actor and target are two different owners, so the count
    // is at least 2. Kept as the data invariant for when "leave organization" or
    // role changes arrive; see labs/04-row-lock.md.
    if (target.role === "owner") {
      const [owners] = await tx
        .select({ count: count() })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, input.organizationId),
            eq(organizationMembers.role, "owner"),
          ),
        );

      if ((owners?.count ?? 0) <= 1) {
        throw new ConflictError(
          "last-owner",
          "Organization must keep at least one owner",
          "Make someone else an owner first",
        );
      }
    }

    // Tenant column is always part of the WHERE, never just the user id.
    await tx
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, input.userId),
          eq(organizationMembers.organizationId, input.organizationId),
        ),
      );
  });
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
