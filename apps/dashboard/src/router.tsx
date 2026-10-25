import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage } from "./pages/LoginPage.tsx";
import { RequireSession } from "./layout/RequireSession.tsx";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  {
    // No path: a layout route. Everything below needs a session.
    Component: RequireSession,
    children: [
      { index: true, element: <Navigate to="/organizations" replace /> },
      {
        path: "/organizations",
        lazy: async () => ({
          Component: (await import("./pages/OrganizationsPage.tsx"))
            .OrganizationsPage,
        }),
      },
      {
        path: "/organizations/:organizationId",
        lazy: async () => ({
          Component: (await import("./pages/OrganizationPage.tsx"))
            .OrganizationPage,
        }),
      },
      {
        path: "/organizations/:organizationId/events/:eventId",
        lazy: async () => ({
          Component: (await import("./pages/EventPage.tsx")).EventPage,
        }),
      },
    ],
  },
]);
