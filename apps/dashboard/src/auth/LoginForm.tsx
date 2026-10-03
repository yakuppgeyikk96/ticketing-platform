import type { CurrentUser } from "@ticketing/contracts";
import { useState, type FormEvent } from "react";
import { login } from "../api/auth.ts";
import { ApiError } from "../api/client.ts";

type LoginState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "failed"; message: string };

type LoginFormProps = {
  onSuccess: (user: CurrentUser) => void;
};

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [loginState, setLoginState] = useState<LoginState>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const loginForm = new FormData(event.currentTarget);

    setLoginState({ status: "submitting" });

    try {
      const user = await login({
        email: textField(loginForm, "email"),
        password: textField(loginForm, "password"),
      });
      onSuccess(user);
    } catch (err) {
      setLoginState({ status: "failed", message: describeError(err) });
    }
  }

  return (
    // The handler is async; the event prop expects void, so the promise is
    // explicitly discarded here (same reason as `void shutdown()` in the API).
    <form onSubmit={(event) => void handleSubmit(event)}>
      <label htmlFor="email">E-posta</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        required
      />
      <label htmlFor="password">Parola</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {loginState.status === "failed" && (
        <p role="alert">{loginState.message}</p>
      )}
      <button disabled={loginState.status === "submitting"}>
        {loginState.status === "submitting" ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}

// FormData.get() is string | File | null. A text input always yields a string;
// anything else means the form markup changed, which is a programmer error.
function textField(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value !== "string") throw new Error(`missing text field ${name}`);
  return value;
}

// The screen decides on the problem type, never on the message text.
function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.problem.type === "/problems/invalid-credentials") {
      return "E-posta veya parola hatalı";
    }
    return err.problem.title;
  }
  return "Sunucuya ulaşılamadı, tekrar dene";
}
