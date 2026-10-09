import {
  membersResponseSchema,
  organizationSchema,
  userOrganizationSchema,
  userOrganizationsResponseSchema,
  type CreateOrganizationInput,
  type Member,
  type Organization,
  type UserOrganization,
  type AddMemberInput,
  memberSchema,
} from "@ticketing/contracts";
import { queryOptions } from "@tanstack/react-query";
import { request } from "./client.ts";
import { z } from "zod";

export const ORGANIZATON_BASE_ROUTE = "/organizations";

export const organizationKeys = {
  all: ["organizations"] as const,
  mine: () => [...organizationKeys.all, "mine"] as const,
  detail: (id: string) => [...organizationKeys.all, id] as const,
  members: (id: string) => [...organizationKeys.detail(id), "members"] as const,
};

export async function listMyOrganizations(): Promise<UserOrganization[]> {
  return await request(ORGANIZATON_BASE_ROUTE, {
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
  return await request(`${ORGANIZATON_BASE_ROUTE}/${organizationId}`, {
    response: userOrganizationSchema,
  });
}

export async function createOrganization(
  body: CreateOrganizationInput,
): Promise<Organization> {
  return await request(ORGANIZATON_BASE_ROUTE, {
    response: organizationSchema,
    method: "POST",
    body,
  });
}

export async function addMember(
  organizationId: string,
  body: AddMemberInput,
): Promise<Member> {
  return await request(`${ORGANIZATON_BASE_ROUTE}/${organizationId}/members`, {
    method: "POST",
    response: memberSchema,
    body,
  });
}

export async function listMembers(organizationId: string): Promise<Member[]> {
  return await request(`${ORGANIZATON_BASE_ROUTE}/${organizationId}/members`, {
    response: membersResponseSchema,
  });
}

export async function removeMember(
  organizationId: string,
  userId: string,
): Promise<void> {
  return await request(
    `${ORGANIZATON_BASE_ROUTE}/${organizationId}/members/${userId}`,
    {
      method: "DELETE",
      response: z.undefined(),
    },
  );
}
