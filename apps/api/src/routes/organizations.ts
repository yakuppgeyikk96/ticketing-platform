import {
  createOrganizationBodySchema,
  userOrganizationsResponseSchema,
  organizationSchema,
  problemSchema,
  organizationParamsSchema,
  addMemberBodySchema,
  memberSchema,
} from "@ticketing/contracts";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { requireAuth } from "../auth/require-auth.ts";
import {
  addMember,
  createOrganization,
  listUserOrganizations,
} from "../organizations/service.ts";
import { requireRoles } from "../auth/require-roles.ts";

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
          200: userOrganizationsResponseSchema,
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

  fastify.post(
    "/:organizationId/members",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin"),
      schema: {
        params: organizationParamsSchema,
        body: addMemberBodySchema,
        response: {
          201: memberSchema,
          400: problemSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
          409: problemSchema,
        },
      },
    },
    async (request, reply) => {
      if (!request.user) throw new Error("unreachable: requireAuth passed");

      const { organizationId } = request.params;
      const { email, role } = request.body;

      const res = await addMember(fastify.db, {
        organizationId,
        email,
        role,
      });

      return reply.code(201).send(res);
    },
  );
};
