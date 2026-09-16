import {
  API_VERSION,
  healthResponseSchema,
  type HealthResponse,
} from "@ticketing/contracts";
import Fastify, { type FastifyServerOptions } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { randomUUID } from "node:crypto";
import dbPlugin from "./plugins/db.ts";
import errorsPlugin from "./plugins/errors.ts";
import authRoutes from "./routes/auth.ts";

export interface AppOptions {
  connectionString: string;
  // Same type Fastify accepts: false, true, or pino options.
  logger: NonNullable<FastifyServerOptions["logger"]>;
}

export async function createApp(opts: AppOptions) {
  const app = Fastify({
    logger: opts.logger,
    // Stable, globally unique ids instead of req-1, req-2 (which reset on restart
    // and collide across replicas).
    genReqId: () => randomUUID(),
    // Trust an id coming from the client or a proxy so one id spans the whole path.
    requestIdHeader: "x-request-id",
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Echo the id back so the caller can quote it in a bug report.
  app.addHook("onSend", (req, reply, payload, done) => {
    void reply.header("x-request-id", req.id);
    done(null, payload);
  });

  await app.register(errorsPlugin);
  await app.register(dbPlugin, { connectionString: opts.connectionString });

  await app.register(authRoutes, { prefix: "/auth" });

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
