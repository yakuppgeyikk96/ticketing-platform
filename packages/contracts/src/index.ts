import { z } from "zod";

export const API_VERSION = "0.0.1";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const registerBodySchema = z.object({
  email: z
    .email()
    .max(254)
    .meta({ example: "yakup@example.com" })
    .transform((v) => v.trim().toLowerCase()),
  password: z
    .string()
    .min(8)
    .max(128)
    .meta({ example: "correct horse battery" }),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const registerResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  createdAt: z.iso.datetime(),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .optional(),
});

export type ProblemBody = z.infer<typeof problemSchema>;

export const loginBodySchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

export const currentUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string().nullable(),
});

// Named components in the generated OpenAPI document. This is zod's own
// registry; the contracts package still knows nothing about the framework.
z.globalRegistry.add(problemSchema, { id: "Problem" });
z.globalRegistry.add(registerBodySchema, { id: "RegisterBody" });
z.globalRegistry.add(registerResponseSchema, { id: "RegisterResponse" });
z.globalRegistry.add(healthResponseSchema, { id: "HealthResponse" });
z.globalRegistry.add(loginBodySchema, { id: "LoginBody" });
z.globalRegistry.add(currentUserSchema, { id: "CurrentUser" });
