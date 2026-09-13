import { createDb, type Db } from "@ticketing/db";
import type { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";

// Declaration merging: this block teaches TypeScript that every FastifyInstance
// has a `db` property. Without it, `app.db` does not exist for the compiler.
declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}

export interface DbPluginOptions {
  connectionString: string;
}

// A plugin is just a function that receives the instance it is registered on.
// Everything it adds (decorators, hooks, routes) belongs to that instance's
// scope. Setup here is synchronous, so we use the callback form and call
// done() when finished; an async form exists for plugins that must await.
const dbPlugin: FastifyPluginCallback<DbPluginOptions> = (app, opts, done) => {
  const { db, close } = createDb(opts.connectionString);

  // decorate = attach a value to the instance so handlers can reach it as app.db
  app.decorate("db", db);

  // onClose runs when app.close() is called: drain and close the pool.
  app.addHook("onClose", async () => {
    await close();
  });

  done();
};

// fp() breaks encapsulation: without it, `db` would only be visible inside this
// plugin and its children. We want it available to the whole app.
export default fp(dbPlugin, { name: "db" });
