import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage } from "./pages/LoginPage.tsx";
import { RequireSession } from "./layout/RequireSession.tsx";
import { AppLayout } from "./layout/AppLayout.tsx";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  {
    // No path: a layout route. Everything below needs a session.
    Component: RequireSession,
    children: [
      {
        // The app shell (header, main) only exists once a session is known.
        Component: AppLayout,
        children: [
          {
            index: true,
            element: <Navigate to="/organizations" replace />,
          },
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
              Component: (await import("./layout/OrganizationLayout.tsx"))
                .OrganizationLayout,
            }),
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import("./pages/OrganizationPage.tsx"))
                    .OrganizationPage,
                }),
              },
              {
                path: "events",
                lazy: async () => ({
                  Component: (await import("./pages/EventsPage.tsx"))
                    .EventsPage,
                }),
              },
              {
                path: "events/:eventId",
                lazy: async () => ({
                  Component: (await import("./pages/EventPage.tsx")).EventPage,
                }),
              },
              {
                path: "venues",
                lazy: async () => ({
                  Component: (await import("./pages/VenuesPage.tsx"))
                    .VenuesPage,
                }),
              },
              {
                path: "members",
                lazy: async () => ({
                  Component: (await import("./pages/MembersPage.tsx"))
                    .MembersPage,
                }),
              },
            ],
          },
        ],
      },
    ],
  },
]);
