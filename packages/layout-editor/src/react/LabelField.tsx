import { useId } from "react";

export function LabelField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="le-editor__field le-editor__field--wide">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        defaultValue={value}
        onBlur={(event) => {
          if (event.currentTarget.value !== value)
            onCommit(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.value = value;
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}
