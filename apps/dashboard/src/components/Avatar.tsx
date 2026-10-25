import type { ReactNode } from "react";
import { IconCircleUser } from "./icons/IconCircleUser.tsx";
import styles from "./Avatar.module.css";

interface AvatarProps {
  content?: ReactNode;
  width?: string;
}

export function Avatar({ content, width = "24" }: AvatarProps) {
  console.log(content);
  return (
    <div
      className={styles.avatar}
      style={{
        width: `${width}px`,
      }}
    >
      {content ? content : <IconCircleUser size={width} />}
    </div>
  );
}
