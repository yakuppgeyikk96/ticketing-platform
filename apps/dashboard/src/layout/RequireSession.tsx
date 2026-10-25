import { Navigate, Outlet, useLocation } from "react-router";
import { ApiError } from "../api/client.ts";
import { Button } from "../components/Button.tsx";
import { useSession } from "../features/auth/useSession.ts";
import { Header } from "./Header.tsx";

// Layout route: every page nested under it renders in <Outlet /> and may
// assume a session exists. Protecting a page means placing it under this node.
export function RequireSession() {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return <p>Yükleniyor…</p>;
  }

  if (session.isError) {
    if (session.error instanceof ApiError && session.error.status === 401) {
      // Remember where the user was heading so LoginPage can send them back.
      return (
        <Navigate to="/login" replace state={{ from: location.pathname }} />
      );
    }

    return (
      <>
        <p>Sunucuya ulaşılamadı</p>
        <Button variant="secondary" onClick={() => void session.refetch()}>
          Tekrar dene
        </Button>
      </>
    );
  }

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
