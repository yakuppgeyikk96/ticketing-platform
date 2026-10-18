import { useId, type ComponentProps } from "react";
// Same look as a text input: one stylesheet, two controls.
import styles from "./Field.module.css";

interface SelectFieldProps extends Omit<ComponentProps<"select">, "id"> {
  label: string;
  name: string;
  error?: string | undefined;
}

// The <select> twin of Field: label, control and error wired together by id.
// Options come in as children.
export function SelectField({
  label,
  error,
  className,
  children,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select
        {...rest}
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
