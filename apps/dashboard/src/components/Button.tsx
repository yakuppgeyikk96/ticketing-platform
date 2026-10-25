import type { ComponentProps } from "react";
import styles from "./Button.module.css";
import { cx } from "../lib/cx.ts";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "danger" | "icon";
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
  const classNames = cx(styles.button, styles[variant], className);

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
