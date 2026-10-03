import {
  organizationSchema,
  userOrganizationsResponseSchema,
  type CreateOrganizationInput,
  type Organization,
  type UserOrganization,
} from "@ticketing/contracts";
import { request } from "./client.ts";

export async function listMyOrganizations(): Promise<UserOrganization[]> {
  return await request("/organizations", {
    response: userOrganizationsResponseSchema,
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
