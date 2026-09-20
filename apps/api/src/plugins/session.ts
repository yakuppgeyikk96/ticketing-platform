import type { FastifyPluginCallback } from "fastify";
import { findSessionByToken, type SessionUser } from "../auth/sessions.ts";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
    sessionId: string | null;
  }
}

export const SESSION_COOKIE = "sid";

const sessionPlugin: FastifyPluginCallback = (app, _opts, done) => {
  app.decorateRequest("user", null);
  app.decorateRequest("sessionId", null);

  app.addHook("onRequest", async (request) => {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return;

    const active = await findSessionByToken(app.db, token);
    if (!active) return;

    request.user = active.user;
    request.sessionId = active.sessionId;
  });

  done();
};

export default fp(sessionPlugin, { name: "session", dependencies: ["db"] });
