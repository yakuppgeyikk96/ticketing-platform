import { sql } from "drizzle-orm";
import {
  pgTable,
  timestamp,
  uuid,
  text,
  uniqueIndex,
  primaryKey,
  check,
  inet,
  index,
  integer,
  unique,
  foreignKey,
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
    role: text("role", { enum: ["owner", "admin", "staff"] }).notNull(),
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

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    ip: inet("ip"),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_key").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
  ],
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    address: text("address"),
    city: text("city"),
    timezone: text("timezone").notNull(),
    capacity: integer("capacity"),
    ...timestamps,
  },
  (t) => [
    unique("venues_organization_id_slug_key").on(t.organizationId, t.slug),
    // Target of the composite FK from occurrences; a FK may only point at a unique column set.
    unique("venues_organization_id_id_key").on(t.organizationId, t.id),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    ...timestamps,
  },
  (t) => [
    unique("events_organization_id_slug_key").on(t.organizationId, t.slug),
    // Same job as venues_organization_id_id_key: composite FK target.
    unique("events_organization_id_id_key").on(t.organizationId, t.id),
    check(
      "events_status_check",
      sql`${t.status} in ('draft', 'published', 'archived')`,
    ),
  ],
);

export const occurrences = pgTable(
  "occurrences",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    eventId: uuid("event_id").notNull(),
    venueId: uuid("venue_id").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: text("status", {
      enum: ["draft", "on_sale", "sold_out", "cancelled", "ended"],
    })
      .notNull()
      .default("draft"),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      name: "occurrences_event_fk",
      columns: [t.organizationId, t.eventId],
      foreignColumns: [events.organizationId, events.id],
    }),
    foreignKey({
      name: "occurrences_venue_fk",
      columns: [t.organizationId, t.venueId],
      foreignColumns: [venues.organizationId, venues.id],
    }),
    index("occurrences_event_id_starts_at_idx").on(t.eventId, t.startsAt),
    index("occurrences_venue_id_starts_at_idx").on(t.venueId, t.startsAt),
    check(
      "occurrences_status_check",
      sql`${t.status} in ('draft', 'on_sale', 'sold_out', 'cancelled', 'ended')`,
    ),
    check(
      "occurrences_time_check",
      sql`${t.endsAt} is null or ${t.endsAt} > ${t.startsAt}`,
    ),
  ],
);
