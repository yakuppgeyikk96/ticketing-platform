import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage } from "./auth/LoginPage.tsx";
import { RequireSession } from "./auth/RequireSession.tsx";
import { OrganizationPage } from "./organizations/OrganizationPage.tsx";
import { OrganizationsPage } from "./organizations/OrganizationsPage.tsx";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  {
    // No path: a layout route. Everything below needs a session.
    Component: RequireSession,
    children: [
      { index: true, element: <Navigate to="/organizations" replace /> },
      { path: "/organizations", Component: OrganizationsPage },
      {
        path: "/organizations/:organizationId",
        Component: OrganizationPage,
      },
    ],
  },
]);
