import type { SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import { login } from "../../api/auth.ts";
import { describeError } from "../../api/errors.ts";
import { textField } from "../../lib/form.ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionKey } from "../../features/auth/useSession.ts";
import { Field } from "../../components/Field.tsx";
import { Button } from "../../components/Button.tsx";
import { Form } from "../../components/Form.tsx";
import styles from "./AuthForm.module.css";

export function LoginForm() {
  const { t } = useTranslation();
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
    <Form onSubmit={handleSubmit} className={styles.form}>
      <Field
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="username"
        required
      />
      <Field
        label={t("auth.password")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {mutation.isError && (
        <p role="alert" className={styles.error}>
          {describeError(mutation.error, t)}
        </p>
      )}
      <Button busy={mutation.isPending} className={styles.submit}>
        {mutation.isPending
          ? t("auth.login.submitting")
          : t("auth.login.submit")}
      </Button>
    </Form>
  );
}
