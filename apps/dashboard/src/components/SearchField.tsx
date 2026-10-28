import { useId, type ComponentProps } from "react";
import { cx } from "../lib/cx.ts";
import fieldStyles from "./Field.module.css";
import { IconSearch } from "./icons/IconSearch.tsx";
import styles from "./SearchField.module.css";

interface SearchFieldProps extends Omit<
  ComponentProps<"input">,
  "id" | "type" | "value" | "onChange"
> {
  // The visible placeholder doubles as the accessible name.
  label: string;
  value: string;
  onChange: (value: string) => void;
}

// A search box for a toolbar: the icon sits inside the same input style
// as Field, so controls on one row share a height and border.
export function SearchField({
  label,
  value,
  onChange,
  className,
  ...rest
}: SearchFieldProps) {
  const id = useId();

  return (
    <div className={cx(styles.search, className)}>
      <label htmlFor={id} className={styles.srOnly}>
        {label}
      </label>
      <span className={styles.icon}>
        <IconSearch size="16" />
      </span>
      <input
        {...rest}
        id={id}
        type="search"
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cx(fieldStyles.input, styles.input)}
      />
    </div>
  );
}
