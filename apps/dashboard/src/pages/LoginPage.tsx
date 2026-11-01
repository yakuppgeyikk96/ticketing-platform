import { Link, Navigate, useLocation } from "react-router";
import { useSession } from "../features/auth/useSession.ts";
import { LoginForm } from "../features/auth/LoginForm.tsx";
import styles from "./AuthPage.module.css";

function wasRegistered(state: unknown): boolean {
  return (
    !!state &&
    typeof state === "object" &&
    "registered" in state &&
    state.registered === true
  );
}

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
      <div className={styles.column}>
        <p className={styles.brand}>Ticketing</p>
        <section className={styles.card} aria-labelledby="login-title">
          <header className={styles.header}>
            <h1 id="login-title" className={styles.title}>
              Giriş yap
            </h1>
            <p className={styles.subtitle}>
              Devam etmek için hesabınızla giriş yapın.
            </p>
          </header>
          {wasRegistered(location.state) && (
            <p role="status" className={styles.notice}>
              Hesabınız oluşturuldu, şimdi giriş yapın.
            </p>
          )}

          <LoginForm />
        </section>
        <p className={styles.help}>
          Hesabınız yok mu? <Link to="/register">Kayıt olun</Link>
        </p>
      </div>
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
