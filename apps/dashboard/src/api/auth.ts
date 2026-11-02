import {
  currentUserSchema,
  registerResponseSchema,
  type CurrentUser,
  type LoginInput,
  type RegisterInput,
  type RegisterResponse,
  type UpdateMeInput,
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

export async function register(body: RegisterInput): Promise<RegisterResponse> {
  return await request("/auth/register", {
    method: "POST",
    body,
    response: registerResponseSchema,
  });
}

export async function me(): Promise<CurrentUser> {
  return await request("/auth/me", {
    response: currentUserSchema,
  });
}

export async function updateMe(body: UpdateMeInput): Promise<CurrentUser> {
  return await request("/auth/me", {
    method: "PATCH",
    body,
    response: currentUserSchema,
  });
}

export async function logout(): Promise<void> {
  return await request("/auth/logout", {
    method: "POST",
    response: z.undefined(),
  });
}
