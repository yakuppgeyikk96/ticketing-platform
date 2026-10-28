import { IconCircleUser } from "./icons/IconCircleUser.tsx";
import styles from "./Avatar.module.css";

interface AvatarProps {
  // Email or display name; the initials come from it. Absent: a generic icon.
  name?: string | undefined;
  size?: number;
}

export function Avatar({ name, size = 32 }: AvatarProps) {
  const initials = name ? initialsOf(name) : null;

  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.375) }}
      aria-hidden="true"
    >
      {initials ?? <IconCircleUser size={String(size)} />}
    </span>
  );
}

// "ada.lovelace@example.com" → "AL", "ada@example.com" → "A", "Ada Lovelace" → "AL".
function initialsOf(name: string): string {
  const local = name.split("@")[0] ?? name;
  const parts = local.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0] ?? "");
  return letters.join("").toLocaleUpperCase("tr-TR");
}
