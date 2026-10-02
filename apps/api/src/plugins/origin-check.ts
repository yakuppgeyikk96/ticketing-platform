import type { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import { ForbiddenError } from "../errors.ts";

const safeMethods = ["GET", "HEAD", "OPTIONS"];
const allowedSites = ["same-origin", "none"];

const originCheckPlugin: FastifyPluginCallback = (app) => {
  app.addHook("onRequest", (request, _reply, done) => {
    if (safeMethods.includes(request.method)) return done();

    const siteHeader = request.headers["sec-fetch-site"];

    if (siteHeader === undefined) return done();

    if (allowedSites.includes(siteHeader)) return done();

    return done(
      new ForbiddenError("cross-site-request", "Cross-site request refused"),
    );
  });
};

export default fp(originCheckPlugin, { name: "origin-check" });
