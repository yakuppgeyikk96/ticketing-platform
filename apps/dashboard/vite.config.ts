import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        // Host dev: loopback. Docker compose: the api service by name.
        target: process.env.API_URL ?? "http://127.0.0.1:3000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
