import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx.ts";
import styles from "./Form.module.css";

// One place for form layout, and later for noValidate + client-side zod.
export function Form({ className, ...rest }: ComponentProps<"form">) {
  return <form {...rest} className={cx(styles.form, className)} />;
}

// The row of buttons at the end: cancel on the left, submit on the right.
function FormActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

// A problem with the whole request, not one field.
function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className={styles.error}>
      {children}
    </p>
  );
}

Form.Actions = FormActions;
Form.Error = FormError;
