import {
  venueSchema,
  venuesResponseSchema,
  type CreateVenueInput,
  type Venue,
} from "@ticketing/contracts";
import { request } from "./client.ts";
import { queryOptions } from "@tanstack/react-query";

export const venueKeys = {
  all: (organizationId: string) =>
    ["organizations", organizationId, "venues"] as const,
  list: (organizationId: string) =>
    [...venueKeys.all(organizationId), "list"] as const,
};

function venuesBase(organizationId: string): string {
  return `/organizations/${organizationId}/venues`;
}

export async function listVenues(organizationId: string): Promise<Venue[]> {
  return await request(venuesBase(organizationId), {
    response: venuesResponseSchema,
  });
}

export function venuesQuery(organizationId: string) {
  return queryOptions({
    queryKey: venueKeys.list(organizationId),
    queryFn: () => listVenues(organizationId),
  });
}

export async function createVenue(
  organizationId: string,
  body: CreateVenueInput,
): Promise<Venue> {
  return await request(venuesBase(organizationId), {
    method: "POST",
    response: venueSchema,
    body,
  });
}
