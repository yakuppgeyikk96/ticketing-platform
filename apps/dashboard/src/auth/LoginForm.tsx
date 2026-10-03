import type { CurrentUser } from "@ticketing/contracts";
import { useState, type SubmitEvent } from "react";
import { login } from "../api/auth.ts";
import { describeError } from "../api/errors.ts";
import { textField } from "../lib/form.ts";

type LoginState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "failed"; message: string };

type LoginFormProps = {
  onSuccess: (user: CurrentUser) => void;
};

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [loginState, setLoginState] = useState<LoginState>({ status: "idle" });

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
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
      setLoginState({
        status: "failed",
        message: describeError(err, loginMessages),
      });
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

// Messages this screen wants to phrase itself, keyed by problem type.
const loginMessages = {
  "/problems/invalid-credentials": "E-posta veya parola hatalı",
};
