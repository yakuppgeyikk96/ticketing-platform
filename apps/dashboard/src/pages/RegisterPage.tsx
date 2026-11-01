import { Link, Navigate } from "react-router";
import { useSession } from "../features/auth/useSession.ts";
import { RegisterForm } from "../features/auth/RegisterForm.tsx";
import styles from "./AuthPage.module.css";

export function RegisterPage() {
  const session = useSession();

  // Already logged in: nothing to register, go to the app.
  if (session.data) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <p className={styles.brand}>Ticketing</p>
        <section className={styles.card} aria-labelledby="register-title">
          <header className={styles.header}>
            <h1 id="register-title" className={styles.title}>
              Kayıt ol
            </h1>
            <p className={styles.subtitle}>Hesap oluşturup devam edin.</p>
          </header>
          <RegisterForm />
        </section>
        <p className={styles.help}>
          Zaten hesabınız var mı? <Link to="/login">Giriş yapın</Link>
        </p>
      </div>
    </main>
  );
}
