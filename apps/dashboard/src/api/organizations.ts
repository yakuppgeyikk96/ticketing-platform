import {
  userOrganizationsResponseSchema,
  type UserOrganization,
} from "@ticketing/contracts";
import { request } from "./client";

export async function listMyOrganizations(): Promise<UserOrganization[]> {
  return await request("/organizations", {
    response: userOrganizationsResponseSchema,
  });
}
