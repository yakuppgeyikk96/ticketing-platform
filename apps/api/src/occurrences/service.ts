import type {
  CreateOccurrenceInput,
  Occurrence,
  OccurrenceStatus,
} from "@ticketing/contracts";
import {
  events,
  isForeignKeyViolation,
  occurrences,
  type Db,
} from "@ticketing/db";
import { and, asc, eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "../errors.ts";

const occurrenceColumns = {
  id: occurrences.id,
  organizationId: occurrences.organizationId,
  eventId: occurrences.eventId,
  venueId: occurrences.venueId,
  startsAt: occurrences.startsAt,
  endsAt: occurrences.endsAt,
  status: occurrences.status,
} satisfies Record<keyof Occurrence, unknown>;

type OccurrenceRow = typeof occurrences.$inferSelect;

// The driver hands back Date for timestamptz; the contract speaks ISO strings.
function toOccurrence(
  row: Pick<OccurrenceRow, keyof typeof occurrenceColumns>,
): Occurrence {
  return {
    ...row,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
  };
}

export async function createOccurrence(
  db: Db,
  input: CreateOccurrenceInput & { organizationId: string; eventId: string },
): Promise<Occurrence> {
  try {
    return await db.transaction(async (tx) => {
      const [event] = await tx
        .select({
          status: events.status,
        })
        .from(events)
        .where(
          and(
            eq(events.organizationId, input.organizationId),
            eq(events.id, input.eventId),
          ),
        )
        .for("share");

      if (!event) {
        throw new NotFoundError("event-not-found", "No event found");
      }

      if (event.status === "archived") {
        throw new ConflictError("event-archived", "Event is archived");
      }

      const [row] = await tx
        .insert(occurrences)
        .values({
          organizationId: input.organizationId,
          eventId: input.eventId,
          venueId: input.venueId,
          startsAt: new Date(input.startsAt),
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
        })
        .returning(occurrenceColumns);

      if (!row) throw new Error("insert returned no row");

      return toOccurrence(row);
    });
  } catch (err) {
    // Composite FK: the venue is missing or belongs to another organization.
    // Both answer "not found"; the database checked it atomically with the insert.
    if (isForeignKeyViolation(err, "occurrences_venue_fk")) {
      throw new NotFoundError("venue-not-found", "Venue not found");
    }
    throw err;
  }
}

export async function listOccurrences(
  db: Db,
  params: { organizationId: string; eventId: string },
): Promise<Occurrence[]> {
  const res = await db
    .select(occurrenceColumns)
    .from(occurrences)
    .where(
      and(
        eq(occurrences.organizationId, params.organizationId),
        eq(occurrences.eventId, params.eventId),
      ),
    )
    .orderBy(asc(occurrences.startsAt), asc(occurrences.id));

  return res.map(toOccurrence);
}

export async function getOccurrence(
  db: Db,
  params: { organizationId: string; eventId: string; occurrenceId: string },
): Promise<Occurrence | null> {
  const [row] = await db
    .select(occurrenceColumns)
    .from(occurrences)
    .where(
      and(
        eq(occurrences.organizationId, params.organizationId),
        eq(occurrences.eventId, params.eventId),
        eq(occurrences.id, params.occurrenceId),
      ),
    )
    .limit(1);

  return row ? toOccurrence(row) : null;
}

// Manual transitions only. sold_out and ended are set by the system (stock,
// clock) later; until then they are unreachable and have no way out.
const allowedTransitions: Record<
  OccurrenceStatus,
  readonly OccurrenceStatus[]
> = {
  draft: ["on_sale", "cancelled"],
  on_sale: ["draft", "cancelled"],
  sold_out: [],
  cancelled: [],
  ended: [],
};

export async function updateOccurrenceStatus(
  db: Db,
  input: {
    organizationId: string;
    eventId: string;
    occurrenceId: string;
    status: OccurrenceStatus;
  },
): Promise<Occurrence> {
  return await db.transaction(async (tx) => {
    // Lock order: event first (shared), then the occurrence (exclusive). The
    // same order createOccurrence uses, so the two can never deadlock.
    const [event] = await tx
      .select({ status: events.status })
      .from(events)
      .where(
        and(
          eq(events.organizationId, input.organizationId),
          eq(events.id, input.eventId),
        ),
      )
      .for("share");

    if (!event) throw new NotFoundError("event-not-found", "Event not found");

    const [current] = await tx
      .select({ status: occurrences.status })
      .from(occurrences)
      .where(
        and(
          eq(occurrences.organizationId, input.organizationId),
          eq(occurrences.eventId, input.eventId),
          eq(occurrences.id, input.occurrenceId),
        ),
      )
      .for("update");

    if (!current) {
      throw new NotFoundError("occurrence-not-found", "Occurrence not found");
    }

    if (!allowedTransitions[current.status].includes(input.status)) {
      throw new ConflictError(
        "invalid-transition",
        `Cannot move an occurrence from ${current.status} to ${input.status}`,
      );
    }

    // Nothing sells under a poster the public cannot see.
    if (input.status === "on_sale" && event.status !== "published") {
      throw new ConflictError(
        "event-not-published",
        "Publish the event before putting an occurrence on sale",
      );
    }

    const [row] = await tx
      .update(occurrences)
      .set({ status: input.status, updatedAt: new Date() })
      .where(
        and(
          eq(occurrences.organizationId, input.organizationId),
          eq(occurrences.id, input.occurrenceId),
        ),
      )
      .returning(occurrenceColumns);

    if (!row) throw new Error("update returned no row");

    return toOccurrence(row);
  });
}
