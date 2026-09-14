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
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(128),
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
