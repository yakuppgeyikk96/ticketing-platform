import { z } from "zod";

export const API_VERSION = "0.0.1";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
