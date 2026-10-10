import {
  slugify,
  type CreateEventInput,
  type Event,
  type EventStatus,
} from "@ticketing/contracts";
import { events, isUniqueViolation, type Db } from "@ticketing/db";
import { and, desc, eq, like, or } from "drizzle-orm";
import { BadRequestError, ConflictError, NotFoundError } from "../errors.ts";
import { pickFreeSlug } from "../lib/slug.ts";

const eventColumns = {
  id: events.id,
  organizationId: events.organizationId,
  title: events.title,
  slug: events.slug,
  description: events.description,
  status: events.status,
} satisfies Record<keyof Event, unknown>;

export async function createEvent(
  db: Db,
  input: CreateEventInput & { organizationId: string },
): Promise<Event> {
  const base = slugify(input.title);

  if (!base) {
    throw new BadRequestError(
      "invalid-title",
      "Event title must contain letters or digits",
    );
  }

  const slug = await findFreeSlug(db, base, input.organizationId);

  try {
    const [row] = await db
      .insert(events)
      .values({
        organizationId: input.organizationId,
        title: input.title,
        slug,
        description: input.description ?? null,
        // status: left to the column default, "draft".
      })
      .returning(eventColumns);

    if (!row) throw new Error("insert returned no row");

    return row;
  } catch (err) {
    if (isUniqueViolation(err, "events_organization_id_slug_key")) {
      throw new ConflictError(
        "slug-taken",
        "Event slug already taken",
        "Try again",
      );
    }
    throw err;
  }
}

export async function listEvents(
  db: Db,
  organizationId: string,
): Promise<Event[]> {
  // Newest first: the dashboard opens on what was just created. Ties broken by
  // id so the order is total; keyset pagination will reuse exactly this pair.
  return await db
    .select(eventColumns)
    .from(events)
    .where(eq(events.organizationId, organizationId))
    .orderBy(desc(events.createdAt), desc(events.id));
}

export async function getEvent(
  db: Db,
  params: { organizationId: string; eventId: string },
): Promise<Event | null> {
  const [row] = await db
    .select(eventColumns)
    .from(events)
    .where(
      and(
        eq(events.organizationId, params.organizationId),
        eq(events.id, params.eventId),
      ),
    );

  return row ?? null;
}

// Which status may follow which. Record<EventStatus, ...> turns a new status
// into a compile error here until it gets a row.
const allowedTransitions: Record<EventStatus, readonly EventStatus[]> = {
  draft: ["published"],
  published: ["draft", "archived"],
  archived: [],
};

export async function updateEventStatus(
  db: Db,
  input: { organizationId: string; eventId: string; status: EventStatus },
): Promise<Event> {
  return await db.transaction(async (tx) => {
    // Lock the row: two concurrent status changes must see each other's
    // result, or the second one decides on a status that is already gone.
    const [current] = await tx
      .select({ status: events.status })
      .from(events)
      .where(
        and(
          eq(events.organizationId, input.organizationId),
          eq(events.id, input.eventId),
        ),
      )
      .for("update");

    if (!current) throw new NotFoundError("event-not-found", "Event not found");

    if (!allowedTransitions[current.status].includes(input.status)) {
      throw new ConflictError(
        "invalid-transition",
        `Cannot move an event from ${current.status} to ${input.status}`,
      );
    }

    const [row] = await tx
      .update(events)
      // defaultNow() applies to INSERT only; UPDATE must touch updated_at itself.
      .set({ status: input.status, updatedAt: new Date() })
      .where(
        and(
          eq(events.organizationId, input.organizationId),
          eq(events.id, input.eventId),
        ),
      )
      .returning(eventColumns);

    if (!row) throw new Error("update returned no row");

    return row;
  });
}

async function findFreeSlug(
  db: Db,
  base: string,
  organizationId: string,
): Promise<string> {
  const rows = await db
    .select({ slug: events.slug })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        or(eq(events.slug, base), like(events.slug, base + "-%")),
      ),
    );

  return pickFreeSlug(base, new Set(rows.map((r) => r.slug)));
}
