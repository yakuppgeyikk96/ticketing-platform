import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage } from "./auth/LoginPage.tsx";
import { RequireSession } from "./auth/RequireSession.tsx";

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
          Component: (await import("./organizations/OrganizationsPage.tsx"))
            .OrganizationsPage,
        }),
      },
      {
        path: "/organizations/:organizationId",
        lazy: async () => ({
          Component: (await import("./organizations/OrganizationPage.tsx"))
            .OrganizationPage,
        }),
      },
    ],
  },
]);
