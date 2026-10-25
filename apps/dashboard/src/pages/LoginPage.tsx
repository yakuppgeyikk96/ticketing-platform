import { Navigate, useLocation } from "react-router";
import { useSession } from "../features/auth/useSession.ts";
import { LoginForm } from "../features/auth/LoginForm.tsx";
import styles from "./LoginPage.module.css";

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

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <header className={styles.header}>
          <h1 id="login-title" className={styles.title}>
            Giriş yap
          </h1>
          <p className={styles.subtitle}>
            Devam etmek için hesabınızla giriş yapın.
          </p>
        </header>
        <LoginForm />
      </section>
    </main>
  );
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
