import { sql } from "drizzle-orm";
import {
  pgTable,
  timestamp,
  uuid,
  text,
  uniqueIndex,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    fullName: text("full_name"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

export const organizations = pgTable("organizations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  taxNumber: text("tax_number"),
  logoUrl: text("logo_url"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...timestamps,
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    role: text("role").notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.organizationId] }),
    check(
      "organization_members_role_check",
      sql`${t.role} in ('owner', 'admin', 'staff')`,
    ),
  ],
);
