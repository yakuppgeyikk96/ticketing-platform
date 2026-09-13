import { createApp } from "./app.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const app = await createApp({ connectionString });

await app.listen({ port: 3000, host: "127.0.0.1" });
