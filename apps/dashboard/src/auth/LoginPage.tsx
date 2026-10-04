import { Navigate, useLocation } from "react-router";
import { LoginForm } from "./LoginForm.tsx";
import { useSession } from "./session.ts";

export function LoginPage() {
  const session = useSession();
  const location = useLocation();

  // Already logged in, or just logged in (LoginForm filled the session cache):
  // go back to where the user was heading, or to the default page.
  if (session.data) {
    return (
      <Navigate to={fromPath(location.state) ?? "/organizations"} replace />
    );
  }

  return <LoginForm />;
}

// location.state is unknown: it comes from history, not from our types.
function fromPath(state: unknown): string | null {
  if (
    state &&
    typeof state === "object" &&
    "from" in state &&
    typeof state.from === "string"
  ) {
    return state.from;
  }
  return null;
}
