import { createApp } from "./app.ts";

const app = createApp();

await app.listen({ port: 3000, host: "127.0.0.1" });
