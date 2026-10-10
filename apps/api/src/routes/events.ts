import {
  createEventBodySchema,
  eventParamsSchema,
  eventSchema,
  eventsResponseSchema,
  organizationParamsSchema,
  problemSchema,
  updateEventStatusBodySchema,
} from "@ticketing/contracts";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { requireAuth } from "../auth/require-auth.ts";
import { requireRoles } from "../auth/require-roles.ts";
import { NotFoundError } from "../errors.ts";
import {
  createEvent,
  getEvent,
  listEvents,
  updateEventStatus,
} from "../events/service.ts";

export const eventsRoutes: FastifyPluginCallbackZod = (fastify) => {
  fastify.post(
    "/",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin"),
      schema: {
        params: organizationParamsSchema,
        body: createEventBodySchema,
        response: {
          201: eventSchema,
          400: problemSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
          409: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const event = await createEvent(fastify.db, {
        organizationId: request.params.organizationId,
        ...request.body,
      });

      return reply.code(201).send(event);
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
          200: eventsResponseSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const events = await listEvents(
        fastify.db,
        request.params.organizationId,
      );

      return reply.code(200).send(events);
    },
  );

  fastify.get(
    "/:eventId",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin", "staff"),
      schema: {
        params: eventParamsSchema,
        response: {
          200: eventSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const event = await getEvent(fastify.db, {
        organizationId: request.params.organizationId,
        eventId: request.params.eventId,
      });

      if (!event) throw new NotFoundError("event-not-found", "Event not found");

      return reply.code(200).send(event);
    },
  );

  // Only the status: title and description edits will get their own PATCH.
  fastify.patch(
    "/:eventId/status",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin"),
      schema: {
        params: eventParamsSchema,
        body: updateEventStatusBodySchema,
        response: {
          200: eventSchema,
          400: problemSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
          409: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const event = await updateEventStatus(fastify.db, {
        organizationId: request.params.organizationId,
        eventId: request.params.eventId,
        status: request.body.status,
      });

      return reply.code(200).send(event);
    },
  );
};
