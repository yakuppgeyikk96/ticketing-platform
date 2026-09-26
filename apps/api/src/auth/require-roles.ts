import type { preHandlerAsyncHookHandler } from "fastify";
import { findMembership, type MemberRole } from "../organizations/service.ts";
import { ForbiddenError, NotFoundError } from "../errors.ts";
import { organizationParamsSchema } from "@ticketing/contracts";

export function requireRoles(
  ...allowedRoles: MemberRole[]
): preHandlerAsyncHookHandler {
  return async (request) => {
    const user = request.user;
    if (!user) throw new Error("unreachable: requireAuth passed");

    const { organizationId } = organizationParamsSchema.parse(request.params);

    const membership = await findMembership(request.server.db, {
      userId: user.id,
      organizationId,
    });

    if (!membership)
      throw new NotFoundError(
        "organization-not-found",
        "Organization not found",
      );

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenError(
        "insufficient-role",
        `You need one of: ${allowedRoles.join(", ")}`,
      );
    }
  };
}
