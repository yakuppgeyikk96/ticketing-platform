import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ticketing/contracts ships raw .ts from src/; Next has to compile it itself.
  transpilePackages: ["@ticketing/contracts"],
  rewrites() {
    // Same shape as the dashboard's Vite proxy: /api/* -> Fastify on :3000.
    // Server components should fetch API_URL directly and skip this hop.
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL ?? "http://127.0.0.1:3000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
