import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

export function createDb(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5_000,
  });

  pool.on("error", (err) => {
    console.error("idle postgres client error", err);
  });

  const db = drizzle({ client: pool, schema });

  return {
    db,
    close: () => pool.end(),
  };
}

export type Db = ReturnType<typeof createDb>["db"];
