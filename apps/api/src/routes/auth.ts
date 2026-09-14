import {
  errorResponseSchema,
  registerBodySchema,
  registerResponseSchema,
} from "@ticketing/contracts";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { hash } from "@node-rs/argon2";
import { isUniqueViolation, users } from "@ticketing/db";

const authRoutes: FastifyPluginCallbackZod = (fastify) => {
  fastify.post(
    "/register",
    {
      schema: {
        body: registerBodySchema,
        response: {
          201: registerResponseSchema,
          409: errorResponseSchema,
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
          return reply.code(409).send({ message: "Email already registered" });
        }

        throw err;
      }
    },
  );
};

export default authRoutes;
