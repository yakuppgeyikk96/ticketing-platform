import {
  membersResponseSchema,
  organizationSchema,
  userOrganizationSchema,
  userOrganizationsResponseSchema,
  type CreateOrganizationInput,
  type Member,
  type Organization,
  type UserOrganization,
} from "@ticketing/contracts";
import { queryOptions } from "@tanstack/react-query";
import { request } from "./client.ts";

export const organizationKeys = {
  all: ["organizations"] as const,
  mine: () => [...organizationKeys.all, "mine"] as const,
  detail: (id: string) => [...organizationKeys.all, id] as const,
  members: (id: string) => [...organizationKeys.detail(id), "members"] as const,
};

export async function listMyOrganizations(): Promise<UserOrganization[]> {
  return await request("/organizations", {
    response: userOrganizationsResponseSchema,
  });
}

// Key, fetcher and data type in one object: components consume it with
// useQuery(myOrganizationsQuery) and read the cache with its typed queryKey.
export const myOrganizationsQuery = queryOptions({
  queryKey: organizationKeys.mine(),
  queryFn: listMyOrganizations,
});

export async function getOrganization(
  organizationId: string,
): Promise<UserOrganization> {
  return await request(`/organizations/${organizationId}`, {
    response: userOrganizationSchema,
  });
}

export async function listMembers(organizationId: string): Promise<Member[]> {
  return await request(`/organizations/${organizationId}/members`, {
    response: membersResponseSchema,
  });
}

export async function createOrganization(
  body: CreateOrganizationInput,
): Promise<Organization> {
  return await request("/organizations", {
    response: organizationSchema,
    method: "POST",
    body,
  });
}
