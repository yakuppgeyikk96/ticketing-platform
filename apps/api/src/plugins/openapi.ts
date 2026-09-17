import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { API_VERSION } from "@ticketing/contracts";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
} from "fastify-type-provider-zod";

// Generates the OpenAPI document from the zod schemas attached to routes.
// Must be registered BEFORE the routes: swagger collects them via onRoute.
const openapiPlugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifySwagger, {
    openapi: {
      openapi: "3.1.0",
      info: { title: "Ticketing API", version: API_VERSION },
    },
    // zod -> JSON Schema for each route's body/params/query/response
    transform: jsonSchemaTransform,
    // schemas registered in z.globalRegistry become named components
    transformObject: jsonSchemaTransformObject,
  });

  // Browser UI at /docs, raw document at /docs/json.
  await app.register(fastifySwaggerUi, { routePrefix: "/docs" });
};

// fp: app.swagger() and the onRoute listener must live at the root scope,
// otherwise sibling route plugins would be invisible to it.
export default fp(openapiPlugin, { name: "openapi" });
