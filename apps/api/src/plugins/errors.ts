import type { ProblemBody } from "@ticketing/contracts";
import type {
  FastifyError,
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";
import { AppError } from "../errors.ts";

// RFC 9457 `type` is a URI. Relative is allowed; we keep it short and stable.
function problemType(slug: string) {
  return `/problems/${slug}`;
}

function sendProblem(
  req: FastifyRequest,
  reply: FastifyReply,
  body: ProblemBody,
) {
  return reply
    .status(body.status)
    .type("application/problem+json")
    .send({ ...body, instance: req.url });
}

const errorsPlugin: FastifyPluginCallback = (app, _opts, done) => {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    // 1. Our own errors: the class already knows status, type and title.
    if (err instanceof AppError) {
      return sendProblem(req, reply, {
        type: problemType(err.type),
        title: err.title,
        status: err.status,
        ...(err.detail !== undefined && { detail: err.detail }),
      });
    }

    // 2. Request failed zod validation: 400 with one entry per field.
    if (hasZodFastifySchemaValidationErrors(err)) {
      return sendProblem(req, reply, {
        type: problemType("validation"),
        title: "Request validation failed",
        status: 400,
        errors: err.validation.map((v) => ({
          field: v.instancePath.replace(/^\//, ""),
          message: v.message ?? "Invalid value",
        })),
      });
    }

    // 3. Response did not match its schema: our bug, never the client's.
    if (isResponseSerializationError(err)) {
      req.log.error(
        { err, issues: err.cause.issues },
        "response serialization failed",
      );
      return sendProblem(req, reply, {
        type: problemType("internal"),
        title: "Internal Server Error",
        status: 500,
      });
    }

    // 4. Fastify's own client errors (413 payload too large, 415 media type, ...).
    if (
      typeof err.statusCode === "number" &&
      err.statusCode >= 400 &&
      err.statusCode < 500
    ) {
      return sendProblem(req, reply, {
        type: problemType(
          err.code
            ?.toLowerCase()
            .replace(/^fst_err_/, "")
            .replace(/_/g, "-") ?? "bad-request",
        ),
        title: err.message,
        status: err.statusCode,
      });
    }

    // 5. Everything else is unexpected: log the real error, hide it from the client.
    req.log.error({ err }, "unhandled error");
    return sendProblem(req, reply, {
      type: problemType("internal"),
      title: "Internal Server Error",
      status: 500,
    });
  });

  // Unknown route: same body shape as every other error.
  app.setNotFoundHandler((req, reply) =>
    sendProblem(req, reply, {
      type: problemType("not-found"),
      title: "Route not found",
      status: 404,
    }),
  );

  done();
};

export default fp(errorsPlugin, { name: "errors" });
