import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const container = document.getElementById("root");

if (!container) throw new Error("index.html is missing #root");

const queryClient = new QueryClient();

createRoot(container).render(
  <QueryClientProvider client={queryClient}>
    <StrictMode>
      <App />
    </StrictMode>
  </QueryClientProvider>,
);
