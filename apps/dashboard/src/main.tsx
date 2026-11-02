// Order matters: tokens first (plain custom properties), then the layered reset.
import "@ticketing/design/tokens.css";
import "@ticketing/design/reset.css";
import "./styles/app.css";
// Starts i18next before the first render so no component sees a missing key.
import "./i18n/index.ts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "./api/client.ts";

const container = document.getElementById("root");

if (!container) throw new Error("index.html is missing #root");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) =>
        !(err instanceof ApiError && err.status < 500) && count < 3,
    },
  },
});

createRoot(container).render(
  <QueryClientProvider client={queryClient}>
    <StrictMode>
      <App />
    </StrictMode>
  </QueryClientProvider>,
);
