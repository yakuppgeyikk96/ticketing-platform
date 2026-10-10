import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { requireAuth } from "../auth/require-auth.ts";
import { requireRoles } from "../auth/require-roles.ts";
import {
  createVenueBodySchema,
  organizationParamsSchema,
  problemSchema,
  venueParamsSchema,
  venueSchema,
  venuesResponseSchema,
} from "@ticketing/contracts";
import { NotFoundError } from "../errors.ts";
import { createVenue, getVenue, listVenues } from "../venues/service.ts";

export const venuesRoutes: FastifyPluginCallbackZod = (fastify) => {
  fastify.post(
    "/",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin"),
      schema: {
        params: organizationParamsSchema,
        body: createVenueBodySchema,
        response: {
          201: venueSchema,
          400: problemSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
          409: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const res = await createVenue(fastify.db, {
        organizationId: request.params.organizationId,
        ...request.body,
      });

      return reply.code(201).send(res);
    },
  );

  fastify.get(
    "/",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin", "staff"),
      schema: {
        params: organizationParamsSchema,
        response: {
          200: venuesResponseSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const venues = await listVenues(
        fastify.db,
        request.params.organizationId,
      );

      return reply.code(200).send(venues);
    },
  );

  fastify.get(
    "/:venueId",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin", "staff"),
      schema: {
        params: venueParamsSchema,
        response: {
          200: venueSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const venue = await getVenue(fastify.db, {
        organizationId: request.params.organizationId,
        venueId: request.params.venueId,
      });

      // Another organization's venue id answers exactly like a missing one.
      if (!venue) throw new NotFoundError("venue-not-found", "Venue not found");

      return reply.code(200).send(venue);
    },
  );
};
