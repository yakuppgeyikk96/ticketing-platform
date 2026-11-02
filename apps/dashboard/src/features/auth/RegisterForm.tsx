import type { SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { register } from "../../api/auth.ts";
import {
  describeError,
  fieldErrors,
  isFormLevelError,
} from "../../api/errors.ts";
import { textField } from "../../lib/form.ts";
import { Field } from "../../components/Field.tsx";
import { Button } from "../../components/Button.tsx";
import { Form } from "../../components/Form.tsx";
import styles from "./AuthForm.module.css";

export function RegisterForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (user) =>
      navigate("/login", {
        replace: true,
        state: { registered: true, email: user.email },
      }),
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // The account's language is taken from the Accept-Language header the
    // client sends, so the body carries no locale.
    mutation.mutate({
      email: textField(form, "email"),
      password: textField(form, "password"),
    });
  }

  const errors = fieldErrors(mutation.error);

  return (
    <Form onSubmit={handleSubmit} className={styles.form}>
      <Field
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        error={errors.email}
      />
      <Field
        label={t("auth.password")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint={t("auth.register.passwordHint")}
        error={errors.password}
      />
      {mutation.isError && isFormLevelError(mutation.error) && (
        <p role="alert" className={styles.error}>
          {describeError(mutation.error, t)}
        </p>
      )}
      <Button busy={mutation.isPending} className={styles.submit}>
        {mutation.isPending
          ? t("auth.register.submitting")
          : t("auth.register.submit")}
      </Button>
    </Form>
  );
}
