import { queryOptions } from "@tanstack/react-query";
import {
  spaceSchema,
  spacesResponseSchema,
  type CreateSpaceInput,
  type Space,
} from "@ticketing/contracts";
import { venueKeys } from "./venues.ts";
import { request } from "./client.ts";

export const spaceKeys = {
  all: (organizationId: string, venueId: string) =>
    [...venueKeys.all(organizationId), venueId, "spaces"] as const,
  list: (organizationId: string, venueId: string) =>
    [...spaceKeys.all(organizationId, venueId), "list"] as const,
};

export async function listSpaces(
  organizationId: string,
  venueId: string,
): Promise<Space[]> {
  return await request(
    `/organizations/${organizationId}/venues/${venueId}/spaces`,
    { response: spacesResponseSchema },
  );
}

export function spacesQuery(organizationId: string, venueId: string) {
  return queryOptions({
    queryKey: spaceKeys.list(organizationId, venueId),
    queryFn: () => listSpaces(organizationId, venueId),
  });
}

export async function createSpace(
  organizationId: string,
  venueId: string,
  body: CreateSpaceInput,
): Promise<Space> {
  return await request(
    `/organizations/${organizationId}/venues/${venueId}/spaces`,
    {
      method: "POST",
      response: spaceSchema,
      body,
    },
  );
}
