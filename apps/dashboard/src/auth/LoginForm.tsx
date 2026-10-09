import type { SubmitEvent } from "react";
import { login } from "../api/auth.ts";
import { describeError } from "../api/errors.ts";
import { textField } from "../lib/form.ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionKey } from "./session.ts";
import { Field } from "../components/Field.tsx";
import { Button } from "../components/Button.tsx";
import { Form } from "../components/Form.tsx";

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
    <Form onSubmit={handleSubmit}>
      <Field
        label="E-posta"
        name="email"
        type="email"
        autoComplete="username"
        required
      />
      <Field
        label="Parola"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {mutation.isError && (
        <p role="alert">{describeError(mutation.error, loginMessages)}</p>
      )}
      <Button busy={mutation.isPending}>
        {mutation.isPending ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>
    </Form>
  );
}

// Messages this screen wants to phrase itself, keyed by problem type.
const loginMessages = {
  "/problems/invalid-credentials": "E-posta veya parola hatalı",
};
