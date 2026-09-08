import { API_VERSION, type HealthResponse } from "@ticketing/contracts";
import { createServer, type Server } from "node:http";

export function createApp(): Server {
  return createServer((req, res) => {
    if (req.url === "/health") {
      const body: HealthResponse = { status: "ok", version: API_VERSION };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
      return;
    }
    res.writeHead(404);
    res.end();
  });
}
