import { createDb } from "@ticketing/db";
import { handledTypes, handlers } from "./handlers.ts";
import { claimNext, markFailed, markProcessed } from "./outbox.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const IDLE_MS = 1000;

const { db, close } = createDb(connectionString);

let stopping = false;

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

async function run(): Promise<void> {
  while (!stopping) {
    const row = await claimNext(db, handledTypes);
    if (!row) {
      await sleep(IDLE_MS);
      continue;
    }
    const handler = handlers[row.type];
    if (!handler) throw new Error(`no handler for outbox type ${row.type}`);

    try {
      await handler(row.payload);
      await markProcessed(db, row.id);
    } catch (err) {
      await markFailed(db, row.id, err);
    }
  }
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    stopping = true;
  });
}

await run();
await close();
