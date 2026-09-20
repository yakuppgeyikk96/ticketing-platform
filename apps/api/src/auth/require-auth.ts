import type { onRequestHookHandler } from "fastify";
import { UnauthorizedError } from "../errors.ts";

export const requireAuth: onRequestHookHandler = (request, _reply, done) => {
  if (!request.user) {
    done(new UnauthorizedError("unauthenticated", "Authentication required"));
    return;
  }

  done();
};
