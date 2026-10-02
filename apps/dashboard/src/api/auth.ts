import {
  currentUserSchema,
  type CurrentUser,
  type LoginInput,
} from "@ticketing/contracts";
import { request } from "./client.ts";
import { z } from "zod";

export async function login(body: LoginInput): Promise<CurrentUser> {
  return await request("/auth/login", {
    method: "POST",
    body,
    response: currentUserSchema,
  });
}

export async function me(): Promise<CurrentUser> {
  return await request("/auth/me", {
    response: currentUserSchema,
  });
}

export async function logout(): Promise<void> {
  return await request("/auth/logout", {
    method: "POST",
    response: z.undefined(),
  });
}
