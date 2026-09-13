import {
  API_VERSION,
  healthResponseSchema,
  type HealthResponse,
} from "@ticketing/contracts";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import dbPlugin from "./plugins/db.ts";

export interface AppOptions {
  connectionString: string;
}

export async function createApp(opts: AppOptions) {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(dbPlugin, { connectionString: opts.connectionString });

  app
    .withTypeProvider<ZodTypeProvider>()
    .get(
      "/health",
      { schema: { response: { 200: healthResponseSchema } } },
      () => {
        const res: HealthResponse = { status: "ok", version: API_VERSION };
        return res;
      },
    );

  return app;
}
