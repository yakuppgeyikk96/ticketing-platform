import type { Locale, ProblemBody } from "@ticketing/contracts";
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
  type ZodFastifySchemaValidationError,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { toLoggableError } from "@ticketing/db";
import { AppError } from "../errors.ts";
import { pickLocale } from "../lib/locale.ts";

// RFC 9457 `type` is a URI. Relative is allowed; we keep it short and stable.
function problemType(slug: string) {
  return `/problems/${slug}`;
}

// Field messages are rendered in the request's language, so the client never
// has to translate them. zod's own locales cover its built-in checks; our
// refine()s in contracts carry a code instead of a sentence and are looked up
// here.
const zodLocales: Record<Locale, z.core.$ZodErrorMap> = {
  tr: z.locales.tr().localeError,
  en: z.locales.en().localeError,
};

const customMessages: Record<string, Record<Locale, string>> = {
  "invalid-timezone": {
    tr: "Geçersiz saat dilimi",
    en: "Unknown time zone",
  },
  "ends-before-starts": {
    tr: "Bitiş, başlangıçtan sonra olmalı",
    en: "End must be after start",
  },
};

function fieldMessage(
  v: ZodFastifySchemaValidationError,
  locale: Locale,
): string {
  const fallback = v.message ?? "Invalid value";

  if (v.keyword === "custom") {
    return customMessages[fallback]?.[locale] ?? fallback;
  }

  // fastify-type-provider-zod flattens the issue into keyword + params; zod's
  // error maps want it back as one object.
  const issue = {
    code: v.keyword,
    path: v.instancePath.split("/").filter(Boolean),
    input: undefined,
    ...v.params,
  } as z.core.$ZodRawIssue;
  const translated = zodLocales[locale](issue);

  if (!translated) return fallback;
  return typeof translated === "string" ? translated : translated.message;
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
      const locale = pickLocale(req.headers["accept-language"]);
      return sendProblem(req, reply, {
        type: problemType("validation"),
        title: "Request validation failed",
        status: 400,
        errors: err.validation.map((v) => ({
          field: v.instancePath.replace(/^\//, ""),
          message: fieldMessage(v, locale),
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
    req.log.error({ err: toLoggableError(err) }, "unhandled error");
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
