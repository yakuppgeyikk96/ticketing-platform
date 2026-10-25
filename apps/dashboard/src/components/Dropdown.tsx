import { useId, type ReactNode } from "react";
import { cx } from "../lib/cx.ts";
import styles from "./Dropdown.module.css";

interface DropdownProps {
  trigger: ReactNode;
  label: string;
  align?: "start" | "end";
  triggerClassName?: string;
  children: ReactNode;
}

export function Dropdown({
  trigger,
  label,
  align = "end",
  triggerClassName,
  children,
}: DropdownProps) {
  const id = useId();

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={label}
        className={cx(styles.trigger, triggerClassName)}
      >
        {trigger}
      </button>
      <div id={id} popover="auto" className={cx(styles.panel, styles[align])}>
        {children}
      </div>
    </>
  );
}
