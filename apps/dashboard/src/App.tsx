import type { CurrentUser } from "@ticketing/contracts";
import { useEffect, useState } from "react";
import { me } from "./api/auth.ts";
import { ApiError } from "./api/client.ts";
import { LoginForm } from "./auth/LoginForm.tsx";
import { OrganizationList } from "./organizations/OrganizationList.tsx";

// "unknown" is not "anonymous": at startup the cookie may be valid and we have
// not asked yet. Showing the login form in that window flashes it at logged-in users.
type Session =
  | { status: "unknown" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unreachable" };

export function App() {
  const [session, setSession] = useState<Session>({ status: "unknown" });

  useEffect(() => {
    // Set by the cleanup: a response that lands after unmount (or after
    // StrictMode's deliberate re-run in dev) must not touch state.
    let ignore = false;

    me()
      .then((user) => {
        if (!ignore) setSession({ status: "authenticated", user });
      })
      .catch((err: unknown) => {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 401) {
          setSession({ status: "anonymous" });
        } else {
          setSession({ status: "unreachable" });
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  switch (session.status) {
    case "unknown":
      return <p>Yükleniyor…</p>;
    case "anonymous":
      return (
        <LoginForm
          onSuccess={(user) => setSession({ status: "authenticated", user })}
        />
      );
    case "authenticated":
      return <OrganizationList />;
    case "unreachable":
      return (
        <p>
          Sunucuya ulaşılamadı.{" "}
          <button onClick={() => window.location.reload()}>Tekrar dene</button>
        </p>
      );
  }
}
