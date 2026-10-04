import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router";
import { logout } from "../api/auth.ts";
import { ApiError } from "../api/client.ts";
import { useSession } from "./session.ts";

// Layout route: every page nested under it renders in <Outlet /> and may
// assume a session exists. Protecting a page means placing it under this node.
export function RequireSession() {
  const session = useSession();
  const location = useLocation();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    // Drop everything, not just the session: the next login may be someone else.
    onSuccess: () => queryClient.clear(),
  });

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
        <button onClick={() => void session.refetch()}>Tekrar dene</button>
      </>
    );
  }

  return (
    <>
      <header>
        <span>{session.data.email}</span>
        <button
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          Çıkış yap
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
