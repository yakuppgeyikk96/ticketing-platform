import { z } from "zod";
import {
  loginBodySchema,
  currentUserSchema,
  problemSchema,
  registerBodySchema,
  registerResponseSchema,
} from "@ticketing/contracts";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import {
  createSession,
  revokeSession,
  revokeUserSessions,
  SESSION_TTL_MS,
} from "../auth/sessions.ts";
import { SESSION_COOKIE } from "../plugins/session.ts";
import { requireAuth } from "../auth/require-auth.ts";
import { authenticate, registerUser } from "../auth/service.ts";

const authRoutes: FastifyPluginCallbackZod<{ secureCookies: boolean }> = (
  fastify,
  opts,
) => {
  fastify.post(
    "/register",
    {
      schema: {
        body: registerBodySchema,
        response: {
          201: registerResponseSchema,
          409: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await registerUser(fastify.db, {
        email,
        password,
      });

      return await reply.code(201).send({
        ...user,
        createdAt: user.createdAt.toISOString(),
      });
    },
  );

  fastify.post(
    "/login",
    {
      schema: {
        body: loginBodySchema,
        response: { 200: currentUserSchema, 401: problemSchema },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await authenticate(fastify.db, { email, password });

      const token = await createSession(fastify.db, {
        userId: user.id,
        userAgent: request.headers["user-agent"] ?? null,
        ip: request.ip,
      });

      void reply.setCookie(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: opts.secureCookies,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_TTL_MS / 1000,
      });

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      };
    },
  );

  fastify.get(
    "/me",
    {
      onRequest: requireAuth,
      schema: { response: { 200: currentUserSchema, 401: problemSchema } },
    },
    (request) => {
      if (!request.user) throw new Error("unreachable: requireAuth passed");
      return request.user;
    },
  );

  fastify.post(
    "/logout",
    {
      onRequest: requireAuth,
      schema: { response: { 204: z.undefined(), 401: problemSchema } },
    },
    async (request, reply) => {
      if (!request.sessionId)
        throw new Error("unreachable: requireAuth passed");

      await revokeSession(fastify.db, request.sessionId);
      void reply.clearCookie(SESSION_COOKIE, { path: "/" });
      return reply.code(204).send();
    },
  );

  fastify.post(
    "/logout-all",
    {
      onRequest: requireAuth,
      schema: { response: { 204: z.undefined(), 401: problemSchema } },
    },
    async (request, reply) => {
      if (!request.user || !request.sessionId)
        throw new Error("unreachable: requireAuth passed");

      await revokeUserSessions(fastify.db, request.user.id);
      void reply.clearCookie(SESSION_COOKIE, { path: "/" });
      return reply.code(204).send();
    },
  );
};

export default authRoutes;
