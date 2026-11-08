import { z } from "zod";

export const API_VERSION = "0.0.1";

export const localeSchema = z.enum(["tr", "en"]);
export type Locale = z.output<typeof localeSchema>;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const memberRoleSchema = z.enum(["owner", "admin", "staff"]);
export type MemberRole = z.infer<typeof memberRoleSchema>;

const emailInputSchema = z
  .email()
  .max(254)
  .meta({ example: "yakup@example.com" })
  .transform((v) => v.trim().toLowerCase());

export const registerBodySchema = z.object({
  email: emailInputSchema,
  password: z
    .string()
    .min(8)
    .max(128)
    .meta({ example: "correct horse battery" }),
  locale: localeSchema.optional(),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export type RegisterInput = z.input<typeof registerBodySchema>;

export const registerResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  createdAt: z.iso.datetime(),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .optional(),
});

export type ProblemBody = z.infer<typeof problemSchema>;

export const loginBodySchema = z.object({
  email: emailInputSchema,
  password: z.string().min(1).max(128),
});

export type LoginInput = z.input<typeof loginBodySchema>;

export const currentUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string().nullable(),
  locale: localeSchema,
});

export type CurrentUser = z.output<typeof currentUserSchema>;

export const updateMeBodySchema = z.object({
  locale: localeSchema,
});

export type UpdateMeInput = z.input<typeof updateMeBodySchema>;

export const createOrganizationBodySchema = z.object({
  name: z.string().trim().min(2).max(100).meta({
    example: "Anadolu Tiyatro",
  }),
});

export type CreateOrganizationInput = z.input<
  typeof createOrganizationBodySchema
>;

export const organizationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
});

export type Organization = z.output<typeof organizationSchema>;

export const organizationParamsSchema = z.object({
  organizationId: z.uuid(),
});

export const userOrganizationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  role: memberRoleSchema,
});

export type UserOrganization = z.output<typeof userOrganizationSchema>;

export const userOrganizationsResponseSchema = z.array(userOrganizationSchema);

export const memberSchema = z.object({
  userId: z.uuid(),
  email: z.email(),
  role: memberRoleSchema,
});

export type Member = z.output<typeof memberSchema>;

export const membersResponseSchema = z.array(memberSchema);

export const addMemberBodySchema = z.object({
  email: emailInputSchema,
  role: memberRoleSchema,
});

export type AddMemberInput = z.input<typeof addMemberBodySchema>;

export const memberParamsSchema = organizationParamsSchema.extend({
  userId: z.uuid(),
});

export const validTimeZones = new Set(Intl.supportedValuesOf("timeZone"));

export const createVenueBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  // Custom messages are codes, not sentences: the API turns them into the
  // request's language (see apps/api/src/plugins/errors.ts).
  timezone: z.string().refine((tz) => validTimeZones.has(tz), {
    message: "invalid-timezone",
  }),
  capacity: z.int().positive().max(1_000_000).optional(),
});

export type CreateVenueInput = z.input<typeof createVenueBodySchema>;

export const venueSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string(),
  slug: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  timezone: z.string(),
  capacity: z.int().nullable(),
});

export type Venue = z.output<typeof venueSchema>;

export const venueParamsSchema = organizationParamsSchema.extend({
  venueId: z.uuid(),
});

export const venuesResponseSchema = z.array(venueSchema);

// Third copy of the list on purpose: CHECK (database), Drizzle enum (TS), here (API).
export const eventStatusSchema = z.enum(["draft", "published", "archived"]);
export type EventStatus = z.infer<typeof eventStatusSchema>;

export const createEventBodySchema = z.object({
  title: z.string().trim().min(2).max(200).meta({ example: "Hamlet" }),
  description: z.string().trim().max(5000).optional(),
});

export type CreateEventInput = z.input<typeof createEventBodySchema>;

export const updateEventStatusBodySchema = z.object({
  status: eventStatusSchema,
});

export type UpdateEventStatusInput = z.input<
  typeof updateEventStatusBodySchema
>;

export const eventSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  status: eventStatusSchema,
});

export type Event = z.output<typeof eventSchema>;

export const eventsResponseSchema = z.array(eventSchema);

export const eventParamsSchema = organizationParamsSchema.extend({
  eventId: z.uuid(),
});

export const occurrenceStatusSchema = z.enum([
  "draft",
  "on_sale",
  "sold_out",
  "cancelled",
  "ended",
]);
export type OccurrenceStatus = z.infer<typeof occurrenceStatusSchema>;

// Instants on the way in must carry an offset ("Z" or "+03:00"): a bare
// local time has no meaning until someone picks a zone, and that someone
// should be the client, which knows the venue's.
const instantInputSchema = z.iso
  .datetime({ offset: true })
  .meta({ example: "2026-11-05T20:00:00+03:00" });

export const createOccurrenceBodySchema = z
  .object({
    spaceId: z.uuid(),
    startsAt: instantInputSchema,
    endsAt: instantInputSchema.optional(),
  })
  .superRefine((body, ctx) => {
    if (!body.endsAt) return;
    if (new Date(body.endsAt) <= new Date(body.startsAt)) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "ends-before-starts",
      });
    }
  });

export type CreateOccurrenceInput = z.input<typeof createOccurrenceBodySchema>;

export const updateOccurrenceStatusBodySchema = z.object({
  status: occurrenceStatusSchema,
});

export type UpdateOccurrenceStatusInput = z.input<
  typeof updateOccurrenceStatusBodySchema
>;

export const occurrenceSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  eventId: z.uuid(),
  spaceId: z.uuid(),
  space: z.object({
    id: z.uuid(),
    name: z.string(),
    venue: z.object({
      id: z.uuid(),
      name: z.string(),
      timezone: z.string(),
    }),
  }),
  // Always UTC on the way out; the client renders it in the venue's zone.
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().nullable(),
  status: occurrenceStatusSchema,
});

export type Occurrence = z.output<typeof occurrenceSchema>;

export const occurrencesResponseSchema = z.array(occurrenceSchema);

export const occurrenceParamsSchema = eventParamsSchema.extend({
  occurrenceId: z.uuid(),
});

export const createSpaceBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  capacity: z.number().int().positive().optional(),
});

export type CreateSpaceInput = z.input<typeof createSpaceBodySchema>;

export const spaceSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  venueId: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  capacity: z.number().int().positive().nullable(),
});

export type Space = z.output<typeof spaceSchema>;

export const spacesResponseSchema = z.array(spaceSchema);

export const spaceParamsSchema = venueParamsSchema.extend({
  spaceId: z.uuid(),
});

export const layoutVersionStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
]);
export type LayoutVersionStatus = z.infer<typeof layoutVersionStatusSchema>;

// Logical drawing coordinates, independent of screen pixels or physical units.
const layoutDimensionSchema = z.int().positive().max(2_147_483_647);

export const createSpaceLayoutBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  width: layoutDimensionSchema,
  height: layoutDimensionSchema,
});
export type CreateSpaceLayoutInput = z.input<
  typeof createSpaceLayoutBodySchema
>;

export const spaceLayoutSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  spaceId: z.uuid(),
  name: z.string(),
});
export type SpaceLayout = z.output<typeof spaceLayoutSchema>;

export const spaceLayoutVersionSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  layoutId: z.uuid(),
  version: z.int().positive().max(2_147_483_647),
  status: layoutVersionStatusSchema,
  width: layoutDimensionSchema,
  height: layoutDimensionSchema,
});
export type SpaceLayoutVersion = z.output<typeof spaceLayoutVersionSchema>;

export const spaceLayoutVersionSummarySchema = spaceLayoutVersionSchema.pick({
  id: true,
  version: true,
});
export type SpaceLayoutVersionSummary = z.output<
  typeof spaceLayoutVersionSummarySchema
>;

export const spaceLayoutListItemSchema = spaceLayoutSchema.extend({
  draftVersion: spaceLayoutVersionSummarySchema.nullable(),
  latestPublishedVersion: spaceLayoutVersionSummarySchema.nullable(),
});
export type SpaceLayoutListItem = z.output<typeof spaceLayoutListItemSchema>;

export const spaceLayoutsResponseSchema = z.array(spaceLayoutListItemSchema);
export type SpaceLayoutsResponse = z.output<typeof spaceLayoutsResponseSchema>;

// Creating a layout also creates its first draft version in one transaction.
export const createSpaceLayoutResponseSchema = z.object({
  layout: spaceLayoutSchema,
  version: spaceLayoutVersionSchema,
});
export type CreateSpaceLayoutResponse = z.output<
  typeof createSpaceLayoutResponseSchema
>;

export const spaceLayoutParamsSchema = spaceParamsSchema.extend({
  layoutId: z.uuid(),
});

// Named components in the generated OpenAPI document. This is zod's own
// registry; the contracts package still knows nothing about the framework.
z.globalRegistry.add(problemSchema, { id: "Problem" });
z.globalRegistry.add(registerBodySchema, { id: "RegisterBody" });
z.globalRegistry.add(registerResponseSchema, { id: "RegisterResponse" });
z.globalRegistry.add(healthResponseSchema, { id: "HealthResponse" });
z.globalRegistry.add(loginBodySchema, { id: "LoginBody" });
z.globalRegistry.add(currentUserSchema, { id: "CurrentUser" });
z.globalRegistry.add(updateMeBodySchema, { id: "UpdateMeBody" });
z.globalRegistry.add(createOrganizationBodySchema, {
  id: "CreateOrganizationBody",
});
z.globalRegistry.add(organizationSchema, { id: "Organization" });
z.globalRegistry.add(userOrganizationSchema, {
  id: "UserOrganization",
});
z.globalRegistry.add(memberSchema, {
  id: "Member",
});
z.globalRegistry.add(addMemberBodySchema, {
  id: "AddMemberBody",
});
z.globalRegistry.add(createVenueBodySchema, { id: "CreateVenueBody" });
z.globalRegistry.add(venueSchema, { id: "Venue" });
z.globalRegistry.add(createEventBodySchema, { id: "CreateEventBody" });
z.globalRegistry.add(updateEventStatusBodySchema, {
  id: "UpdateEventStatusBody",
});
z.globalRegistry.add(eventSchema, { id: "Event" });
z.globalRegistry.add(createOccurrenceBodySchema, {
  id: "CreateOccurrenceBody",
});
z.globalRegistry.add(updateOccurrenceStatusBodySchema, {
  id: "UpdateOccurrenceStatusBody",
});
z.globalRegistry.add(occurrenceSchema, { id: "Occurrence" });
z.globalRegistry.add(spaceSchema, { id: "Space" });
z.globalRegistry.add(createSpaceBodySchema, { id: "CreateSpaceBody" });
z.globalRegistry.add(createSpaceLayoutBodySchema, {
  id: "CreateSpaceLayoutBody",
});
z.globalRegistry.add(spaceLayoutSchema, { id: "SpaceLayout" });
z.globalRegistry.add(spaceLayoutVersionSchema, { id: "SpaceLayoutVersion" });
z.globalRegistry.add(spaceLayoutVersionSummarySchema, {
  id: "SpaceLayoutVersionSummary",
});
z.globalRegistry.add(spaceLayoutListItemSchema, { id: "SpaceLayoutListItem" });
z.globalRegistry.add(createSpaceLayoutResponseSchema, {
  id: "CreateSpaceLayoutResponse",
});

export * from "./slug/index.ts";
