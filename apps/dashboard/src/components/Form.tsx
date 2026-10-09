import type { ComponentProps } from "react";
import styles from "./Form.module.css";

// One place for form layout, and later for noValidate + client-side zod.
export function Form({ className, ...rest }: ComponentProps<"form">) {
  return (
    <form
      {...rest}
      className={[styles.form, className].filter(Boolean).join(" ")}
    />
  );
}
