import type { ReactNode } from "react";
import { cx } from "../lib/cx.ts";
import styles from "./Badge.module.css";

interface BadgeProps {
  variant?: "neutral" | "accent" | "success" | "warning" | "danger";
  // A leading dot: for statuses, where the colour carries meaning.
  dot?: boolean;
  children: ReactNode;
}

export function Badge({
  variant = "neutral",
  dot = false,
  children,
}: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[variant])}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
