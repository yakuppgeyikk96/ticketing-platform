import { useId, type ComponentProps } from "react";
import styles from "./Field.module.css";

interface FieldProps extends Omit<ComponentProps<"input">, "id"> {
  label: string;
  name: string;
  error?: string | undefined;
}

// Label, input and error wired together by id, so screen readers announce
// the label on focus and the error as soon as it appears.
export function Field({ label, error, className, ...rest }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        {...rest}
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
