import type { CreateOccurrenceInput, Occurrence } from "@ticketing/contracts";
import {
  events,
  isForeignKeyViolation,
  occurrences,
  type Db,
} from "@ticketing/db";
import { and, eq } from "drizzle-orm";
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
