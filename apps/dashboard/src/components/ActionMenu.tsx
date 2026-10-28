import type { ReactNode } from "react";
import { Dropdown } from "./Dropdown.tsx";
import { IconEllipsis } from "./icons/IconEllipsis.tsx";
import styles from "./ActionMenu.module.css";

interface ActionMenuProps {
  // Names the row for assistive tech: "YG Corp işlemleri".
  label: string;
  children: ReactNode;
}

// The "⋯" at the end of a table row; items are Dropdown.Item.
export function ActionMenu({ label, children }: ActionMenuProps) {
  return (
    <Dropdown
      label={label}
      align="end"
      triggerClassName={styles.trigger ?? ""}
      trigger={<IconEllipsis size="16" />}
    >
      {children}
    </Dropdown>
  );
}
