import {
  createOrganizationBodySchema,
  myOrganizationsResponseSchema,
  organizationSchema,
  problemSchema,
} from "@ticketing/contracts";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { requireAuth } from "../auth/require-auth.ts";
import {
  createOrganization,
  listUserOrganizations,
} from "../organizations/service.ts";

export const organizationsRoutes: FastifyPluginCallbackZod = (fastify) => {
  fastify.post(
    "/",
    {
      onRequest: requireAuth,
      schema: {
        body: createOrganizationBodySchema,
        response: {
          201: organizationSchema,
          400: problemSchema,
          401: problemSchema,
          409: problemSchema,
        },
      },
    },
    async (request, reply) => {
      if (!request.user) throw new Error("unreachable: requireAuth passed");

      const org = await createOrganization(fastify.db, {
        name: request.body.name,
        ownerId: request.user.id,
      });

      return reply.code(201).send(org);
    },
  );

  fastify.get(
    "/",
    {
      onRequest: requireAuth,
      schema: {
        response: {
          200: myOrganizationsResponseSchema,
          401: problemSchema,
        },
      },
    },
    async (request, reply) => {
      if (!request.user) throw new Error("unreachable: requireAuth passed");

      const organizations = await listUserOrganizations(
        fastify.db,
        request.user.id,
      );

      return reply.code(200).send(organizations);
    },
  );
};
