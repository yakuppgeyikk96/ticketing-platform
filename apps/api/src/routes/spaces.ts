import {
  createSpaceBodySchema,
  problemSchema,
  spaceSchema,
  spacesResponseSchema,
  venueParamsSchema,
} from "@ticketing/contracts";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { requireAuth } from "../auth/require-auth.ts";
import { requireRoles } from "../auth/require-roles.ts";
import { NotFoundError } from "../errors.ts";
import { createSpace, listSpaces } from "../spaces/service.ts";
import { getVenue } from "../venues/service.ts";

export const spacesRoutes: FastifyPluginCallbackZod = (fastify) => {
  fastify.post(
    "/",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin"),
      schema: {
        params: venueParamsSchema,
        body: createSpaceBodySchema,
        response: {
          201: spaceSchema,
          400: problemSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
          409: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const space = await createSpace(fastify.db, {
        ...request.body,
        ...request.params,
      });
      return reply.code(201).send(space);
    },
  );

  fastify.get(
    "/",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin", "staff"),
      schema: {
        params: venueParamsSchema,
        response: {
          200: spacesResponseSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
        },
      },
    },
    async (request) => {
      const venue = await getVenue(fastify.db, request.params);

      if (!venue) {
        throw new NotFoundError("venue-not-found", "Venue not found");
      }

      return await listSpaces(fastify.db, request.params);
    },
  );
};
