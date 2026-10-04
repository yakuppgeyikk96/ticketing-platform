import type { SubmitEvent } from "react";
import { login } from "../api/auth.ts";
import { describeError } from "../api/errors.ts";
import { textField } from "../lib/form.ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionKey } from "./session.ts";

export function LoginForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => queryClient.setQueryData(sessionKey, user),
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const loginForm = new FormData(event.currentTarget);

    mutation.mutate({
      email: textField(loginForm, "email"),
      password: textField(loginForm, "password"),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
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
      {mutation.isError && (
        <p role="alert">{describeError(mutation.error, loginMessages)}</p>
      )}
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}

// Messages this screen wants to phrase itself, keyed by problem type.
const loginMessages = {
  "/problems/invalid-credentials": "E-posta veya parola hatalı",
};
