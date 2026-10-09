import type { ComponentProps } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "danger";
  // A mutation in flight: disables the button and tells assistive tech why.
  busy?: boolean;
}

export function Button({
  variant = "primary",
  busy = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const classNames = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    // {...rest} first, so the props this component owns cannot be overridden.
    <button
      {...rest}
      className={classNames}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
    >
      {children}
    </button>
  );
}
