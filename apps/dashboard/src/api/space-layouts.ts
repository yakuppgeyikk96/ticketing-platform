import { queryOptions } from "@tanstack/react-query";
import {
  createSpaceLayoutResponseSchema,
  spaceLayoutsResponseSchema,
  spaceLayoutVersionResponseSchema,
  type CreateSpaceLayoutInput,
  type CreateSpaceLayoutResponse,
  type SpaceLayoutsResponse,
  type SpaceLayoutVersionResponse,
} from "@ticketing/contracts";
import { request } from "./client.ts";
import { spaceKeys } from "./spaces.ts";

export const spaceLayoutKeys = {
  all: (organizationId: string, venueId: string, spaceId: string) =>
    [...spaceKeys.all(organizationId, venueId), spaceId, "layouts"] as const,
  list: (organizationId: string, venueId: string, spaceId: string) =>
    [...spaceLayoutKeys.all(organizationId, venueId, spaceId), "list"] as const,
  version: (
    organizationId: string,
    venueId: string,
    spaceId: string,
    layoutId: string,
    versionId: string,
  ) =>
    [
      ...spaceLayoutKeys.all(organizationId, venueId, spaceId),
      layoutId,
      "versions",
      versionId,
    ] as const,
};

function layoutsBase(
  organizationId: string,
  venueId: string,
  spaceId: string,
): string {
  return `/organizations/${organizationId}/venues/${venueId}/spaces/${spaceId}/layouts`;
}

export async function listSpaceLayouts(
  organizationId: string,
  venueId: string,
  spaceId: string,
): Promise<SpaceLayoutsResponse> {
  return await request(layoutsBase(organizationId, venueId, spaceId), {
    response: spaceLayoutsResponseSchema,
  });
}

export function spaceLayoutsQuery(
  organizationId: string,
  venueId: string,
  spaceId: string,
) {
  return queryOptions({
    queryKey: spaceLayoutKeys.list(organizationId, venueId, spaceId),
    queryFn: () => listSpaceLayouts(organizationId, venueId, spaceId),
  });
}

export async function createSpaceLayout(
  organizationId: string,
  venueId: string,
  spaceId: string,
  body: CreateSpaceLayoutInput,
): Promise<CreateSpaceLayoutResponse> {
  return await request(layoutsBase(organizationId, venueId, spaceId), {
    method: "POST",
    response: createSpaceLayoutResponseSchema,
    body,
  });
}

export async function getSpaceLayoutVersion(
  organizationId: string,
  venueId: string,
  spaceId: string,
  layoutId: string,
  versionId: string,
): Promise<SpaceLayoutVersionResponse> {
  return await request(
    `${layoutsBase(organizationId, venueId, spaceId)}/${layoutId}/versions/${versionId}`,
    {
      response: spaceLayoutVersionResponseSchema,
    },
  );
}

export function spaceLayoutVersionQuery(
  organizationId: string,
  venueId: string,
  spaceId: string,
  layoutId: string,
  versionId: string,
) {
  return queryOptions({
    queryKey: spaceLayoutKeys.version(
      organizationId,
      venueId,
      spaceId,
      layoutId,
      versionId,
    ),
    queryFn: () =>
      getSpaceLayoutVersion(
        organizationId,
        venueId,
        spaceId,
        layoutId,
        versionId,
      ),
  });
}
