import type { SubmitEvent } from "react";
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
    mutation.mutate({
      email: textField(form, "email"),
      password: textField(form, "password"),
    });
  }

  const errors = fieldErrors(mutation.error);

  return (
    <Form onSubmit={handleSubmit} className={styles.form}>
      <Field
        label="E-posta"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={errors.email}
      />
      <Field
        label="Parola"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="En az 8 karakter"
        error={errors.password}
      />
      {mutation.isError && isFormLevelError(mutation.error) && (
        <p role="alert" className={styles.error}>
          {describeError(mutation.error, registerMessages)}
        </p>
      )}
      <Button busy={mutation.isPending} className={styles.submit}>
        {mutation.isPending ? "Kayıt olunuyor…" : "Kayıt ol"}
      </Button>
    </Form>
  );
}

const registerMessages = {
  "/problems/email-taken": "Bu e-posta ile zaten bir hesap var",
};
