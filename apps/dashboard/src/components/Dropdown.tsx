// Written by Claude (Claude Code), 2026-10-25.

import {
  useId,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  type ToggleEvent,
} from "react";
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  function place(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== "open" || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panel = event.currentTarget;
    panel.style.top = `${rect.bottom + 4}px`;
    if (align === "end") {
      panel.style.right = `${window.innerWidth - rect.right}px`;
      panel.style.left = "auto";
    } else {
      panel.style.left = `${rect.left}px`;
      panel.style.right = "auto";
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-label={label}
        className={cx(styles.trigger, triggerClassName)}
      >
        {trigger}
      </button>
      <div
        id={id}
        popover="auto"
        className={styles.panel}
        onBeforeToggle={place}
      >
        {children}
      </div>
    </>
  );
}

interface DropdownItemProps extends Omit<ComponentProps<"button">, "type"> {
  icon?: ReactNode;
  danger?: boolean;
}

function DropdownItem({
  icon,
  danger = false,
  className,
  children,
  onClick,
  ...rest
}: DropdownItemProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (!event.defaultPrevented) {
      event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover();
    }
  }

  return (
    <button
      {...rest}
      type="button"
      className={cx(styles.item, danger && styles.danger, className)}
      onClick={handleClick}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
}

Dropdown.Item = DropdownItem;
