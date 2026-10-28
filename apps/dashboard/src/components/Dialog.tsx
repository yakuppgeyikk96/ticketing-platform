import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { cx } from "../lib/cx.ts";
import { Button } from "./Button.tsx";
import { IconX } from "./icons/IconX.tsx";
import styles from "./Dialog.module.css";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  placement?: "center" | "top";
  children: ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  placement = "center",
  children,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className={cx(styles.dialog, placement === "top" && styles.top)}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className={styles.content}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <Button variant="icon" onClick={onClose} aria-label="Kapat">
            <IconX size="20" />
          </Button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
