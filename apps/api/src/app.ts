import { API_VERSION, type HealthResponse } from "@ticketing/contracts";
import Fastify from "fastify";

export function createApp() {
  const app = Fastify({ logger: true });

  app.get("/health", () => {
    const res: HealthResponse = {
      status: "ok",
      version: API_VERSION,
    };

    return res;
  });

  return app;
}
