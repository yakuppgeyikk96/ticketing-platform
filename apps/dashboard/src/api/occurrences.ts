import {
  occurrenceSchema,
  occurrencesResponseSchema,
  type CreateOccurrenceInput,
  type Occurrence,
  type OccurrenceStatus,
} from "@ticketing/contracts";
import { eventKeys, eventsBase } from "./events.ts";
import { request } from "./client.ts";
import { queryOptions } from "@tanstack/react-query";

export const occurrenceKeys = {
  all: (organizationId: string, eventId: string) =>
    [...eventKeys.detail(organizationId, eventId), "occurrences"] as const,
  list: (organizationId: string, eventId: string) =>
    [...occurrenceKeys.all(organizationId, eventId), "list"] as const,
};

function occurrencesBase(organizationId: string, eventId: string): string {
  return `${eventsBase(organizationId)}/${eventId}/occurrences`;
}

export async function listOccurrences(
  organizationId: string,
  eventId: string,
): Promise<Occurrence[]> {
  return await request(occurrencesBase(organizationId, eventId), {
    response: occurrencesResponseSchema,
  });
}

export function occurrencesQuery(organizationId: string, eventId: string) {
  return queryOptions({
    queryKey: occurrenceKeys.list(organizationId, eventId),
    queryFn: () => listOccurrences(organizationId, eventId),
  });
}

export async function createOccurrence(
  organizationId: string,
  eventId: string,
  body: CreateOccurrenceInput,
): Promise<Occurrence> {
  return await request(occurrencesBase(organizationId, eventId), {
    method: "POST",
    response: occurrenceSchema,
    body,
  });
}

export async function updateOccurrenceStatus(
  organizationId: string,
  eventId: string,
  occurrenceId: string,
  status: OccurrenceStatus,
): Promise<Occurrence> {
  return await request(
    `${occurrencesBase(organizationId, eventId)}/${occurrenceId}/status`,
    {
      method: "PATCH",
      response: occurrenceSchema,
      body: { status },
    },
  );
}
