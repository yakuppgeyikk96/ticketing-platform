import {
  API_VERSION,
  healthResponseSchema,
  type HealthResponse,
} from "@ticketing/contracts";
import Fastify from "fastify";
import {
  validatorCompiler,
  serializerCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

export function createApp() {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.withTypeProvider<ZodTypeProvider>().get(
    "/health",
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    () => {
      const res: HealthResponse = {
        status: "ok",
        version: API_VERSION,
      };

      return res;
    },
  );

  return app;
}
