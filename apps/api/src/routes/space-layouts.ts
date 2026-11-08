import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { requireAuth } from "../auth/require-auth.ts";
import { requireRoles } from "../auth/require-roles.ts";
import {
  createSpaceLayoutBodySchema,
  createSpaceLayoutResponseSchema,
  problemSchema,
  spaceParamsSchema,
} from "@ticketing/contracts";
import { createSpaceLayout } from "../space-layouts/service.ts";

export const spaceLayoutsRoutes: FastifyPluginCallbackZod = (fastify) => {
  fastify.post(
    "/",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin"),
      schema: {
        params: spaceParamsSchema,
        body: createSpaceLayoutBodySchema,
        response: {
          201: createSpaceLayoutResponseSchema,
          400: problemSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const spaceLayout = await createSpaceLayout(fastify.db, {
        ...request.params,
        ...request.body,
      });

      return reply.code(201).send(spaceLayout);
    },
  );
};
