import {
  createOrganizationBodySchema,
  userOrganizationsResponseSchema,
  organizationSchema,
  problemSchema,
  organizationParamsSchema,
  addMemberBodySchema,
  memberSchema,
  memberParamsSchema,
  membersResponseSchema,
  userOrganizationSchema,
} from "@ticketing/contracts";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { requireAuth } from "../auth/require-auth.ts";
import {
  addMember,
  createOrganization,
  getOrganizationForUser,
  listMembers,
  listUserOrganizations,
  removeMember,
} from "../organizations/service.ts";
import { requireRoles } from "../auth/require-roles.ts";
import { NotFoundError } from "../errors.ts";
import { z } from "zod";

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

  fastify.get(
    "/:organizationId",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin", "staff"),
      schema: {
        params: organizationParamsSchema,
        response: {
          200: userOrganizationSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
        },
      },
    },
    async (request, reply) => {
      if (!request.user) throw new Error("unreachable: requireAuth passed");

      const org = await getOrganizationForUser(fastify.db, {
        organizationId: request.params.organizationId,
        userId: request.user.id,
      });

      // requireRoles already saw a membership, but outside a transaction it can
      // vanish between the hook and this query. Defensive, not a new rule.
      if (!org) {
        throw new NotFoundError(
          "organization-not-found",
          "Organization not found",
        );
      }

      return reply.code(200).send(org);
    },
  );

  fastify.get(
    "/:organizationId/members",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner", "admin", "staff"),
      schema: {
        params: organizationParamsSchema,
        response: {
          200: membersResponseSchema,
          401: problemSchema,
          403: problemSchema,
          404: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const members = await listMembers(
        fastify.db,
        request.params.organizationId,
      );

      return reply.code(200).send(members);
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

  fastify.delete(
    "/:organizationId/members/:userId",
    {
      onRequest: requireAuth,
      preHandler: requireRoles("owner"),
      schema: {
        params: memberParamsSchema,
        response: {
          204: z.undefined(),
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

      await removeMember(fastify.db, {
        organizationId: request.params.organizationId,
        userId: request.params.userId,
        actorId: request.user.id,
      });

      return reply.code(204).send();
    },
  );
};
