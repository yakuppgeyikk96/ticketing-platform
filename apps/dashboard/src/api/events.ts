import { queryOptions } from "@tanstack/react-query";
import {
  eventSchema,
  eventsResponseSchema,
  type CreateEventInput,
  type Event,
  type EventStatus,
} from "@ticketing/contracts";
import { request } from "./client.ts";

// Nested under the organization key on purpose: invalidating
// organizationKeys.detail(id) refreshes this organization's events as well.
export const eventKeys = {
  all: (organizationId: string) =>
    ["organizations", organizationId, "events"] as const,
  list: (organizationId: string) =>
    [...eventKeys.all(organizationId), "list"] as const,
  detail: (organizationId: string, eventId: string) =>
    [...eventKeys.all(organizationId), eventId] as const,
};

export function eventsBase(organizationId: string): string {
  return `/organizations/${organizationId}/events`;
}

export async function listEvents(organizationId: string): Promise<Event[]> {
  return await request(eventsBase(organizationId), {
    response: eventsResponseSchema,
  });
}

// A function, unlike myOrganizationsQuery: the key depends on the organization.
export function eventsQuery(organizationId: string) {
  return queryOptions({
    queryKey: eventKeys.list(organizationId),
    queryFn: () => listEvents(organizationId),
  });
}

export async function getEvent(
  organizationId: string,
  eventId: string,
): Promise<Event> {
  return await request(`${eventsBase(organizationId)}/${eventId}`, {
    response: eventSchema,
  });
}

export async function createEvent(
  organizationId: string,
  body: CreateEventInput,
): Promise<Event> {
  return await request(eventsBase(organizationId), {
    method: "POST",
    response: eventSchema,
    body,
  });
}

export async function updateEventStatus(
  organizationId: string,
  eventId: string,
  status: EventStatus,
): Promise<Event> {
  return await request(`${eventsBase(organizationId)}/${eventId}/status`, {
    method: "PATCH",
    response: eventSchema,
    body: { status },
  });
}
