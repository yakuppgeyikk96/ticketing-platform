import { z } from "zod";
import {
  loginBodySchema,
  currentUserSchema,
  problemSchema,
  registerBodySchema,
  registerResponseSchema,
} from "@ticketing/contracts";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { hash, verify } from "@node-rs/argon2";
import { isUniqueViolation, users } from "@ticketing/db";
import { ConflictError, UnauthorizedError } from "../errors.ts";
import { and, isNull, sql } from "drizzle-orm";
import {
  createSession,
  revokeSession,
  revokeUserSessions,
  SESSION_TTL_MS,
} from "../auth/sessions.ts";
import { SESSION_COOKIE } from "../plugins/session.ts";
import { requireAuth } from "../auth/require-auth.ts";

// Verified against when the email is unknown, so both paths cost one argon2 run
const DUMMY_HASH = await hash("dummy-password");

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

      const passwordHash = await hash(password);

      try {
        const [user] = await fastify.db
          .insert(users)
          .values({
            email,
            passwordHash,
          })
          .returning({
            id: users.id,
            email: users.email,
            createdAt: users.createdAt,
          });

        if (!user) {
          throw new Error("insert return no row");
        }

        return await reply.code(201).send({
          ...user,
          createdAt: user.createdAt.toISOString(),
        });
      } catch (err) {
        if (isUniqueViolation(err, "users_email_lower_idx")) {
          throw new ConflictError(
            "email-taken",
            "Email already registered",
            "An account with this email already exists",
          );
        }

        throw err;
      }
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

      const [user] = await fastify.db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(
          and(sql`lower(${users.email}) = ${email}`, isNull(users.deletedAt)),
        )
        .limit(1);

      // Always run argon2: unknown email, deleted user and OIDC-only user all
      // take the dummy path and cost the same as a real check.
      const ok = await verify(user?.passwordHash ?? DUMMY_HASH, password);
      if (!user || !ok) {
        throw new UnauthorizedError(
          "invalid-credentials",
          "Invalid email or password",
        );
      }

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
