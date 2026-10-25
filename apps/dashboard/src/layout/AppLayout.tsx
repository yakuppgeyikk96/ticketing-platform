import { Outlet } from "react-router";
import { Header } from "./Header.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { useStoredFlag } from "../hooks/useStoredFlag.ts";

// Layout route for the signed-in app: header plus the page in <Outlet />.
// Sits under RequireSession, so it never renders without a session and the
// login page never gets the shell.
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useStoredFlag("sidebar-open", true);

  return (
    <div className="app-shell" data-sidebar={sidebarOpen ? "open" : "closed"}>
      <Header onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
