import type { ReactNode } from "react";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  start?: ReactNode;
  end?: ReactNode;
}

// Sits above a table: filters and search on the start side, actions on the end.
export function Toolbar({ start, end }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.group}>{start}</div>
      <div className={styles.group}>{end}</div>
    </div>
  );
}
