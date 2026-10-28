import { useId, type ComponentProps } from "react";
import { cx } from "../lib/cx.ts";
import styles from "./Field.module.css";

interface FieldProps extends Omit<ComponentProps<"input">, "id"> {
  label: string;
  name: string;
  // A line under the input that explains the field; read out with it.
  hint?: string;
  error?: string | undefined;
}

// Label, input and error wired together by id, so screen readers announce
// the label on focus and the error as soon as it appears.
export function Field({ label, hint, error, className, ...rest }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        {...rest}
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
