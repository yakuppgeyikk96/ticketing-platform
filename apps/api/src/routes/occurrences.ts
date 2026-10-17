import {
  createOccurrenceBodySchema,
  eventParamsSchema,
  occurrenceParamsSchema,
  occurrenceSchema,
  occurrencesResponseSchema,
  problemSchema,
  updateOccurrenceStatusBodySchema,
} from "@ticketing/contracts";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { requireAuth } from "../auth/require-auth.ts";
import { requireRoles } from "../auth/require-roles.ts";
import { NotFoundError } from "../errors.ts";
import { getEvent } from "../events/service.ts";
import {
  createOccurrence,
  getOccurrence,
  listOccurrences,
  updateOccurrenceStatus,
} from "../occurrences/service.ts";

export const occurrencesRoutes: FastifyPluginCallbackZod = (fastify) => {
  fastify.post(
    "/",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin"),
      schema: {
        params: eventParamsSchema,
        body: createOccurrenceBodySchema,
        response: {
          201: occurrenceSchema,
          400: problemSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
          409: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const occurrence = await createOccurrence(fastify.db, {
        organizationId: request.params.organizationId,
        eventId: request.params.eventId,
        ...request.body,
      });

      return reply.code(201).send(occurrence);
    },
  );

  fastify.get(
    "/",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin", "staff"),
      schema: {
        params: eventParamsSchema,
        response: {
          200: occurrencesResponseSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const { organizationId, eventId } = request.params;

      // An unknown event is a 404, not an empty list. Two reads, no write:
      // nothing needs to be atomic here, so the route composes them.
      const event = await getEvent(fastify.db, { organizationId, eventId });
      if (!event) throw new NotFoundError("event-not-found", "Event not found");

      const occurrences = await listOccurrences(fastify.db, {
        organizationId,
        eventId,
      });

      return reply.code(200).send(occurrences);
    },
  );

  fastify.get(
    "/:occurrenceId",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin", "staff"),
      schema: {
        params: occurrenceParamsSchema,
        response: {
          200: occurrenceSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const occurrence = await getOccurrence(fastify.db, request.params);

      if (!occurrence) {
        throw new NotFoundError("occurrence-not-found", "Occurrence not found");
      }

      return reply.code(200).send(occurrence);
    },
  );

  fastify.patch(
    "/:occurrenceId/status",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin"),
      schema: {
        params: occurrenceParamsSchema,
        body: updateOccurrenceStatusBodySchema,
        response: {
          200: occurrenceSchema,
          400: problemSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
          409: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const occurrence = await updateOccurrenceStatus(fastify.db, {
        ...request.params,
        status: request.body.status,
      });

      return reply.code(200).send(occurrence);
    },
  );
};
