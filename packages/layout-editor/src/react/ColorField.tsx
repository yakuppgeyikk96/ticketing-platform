import { useId, useState, type KeyboardEvent } from "react";
import { parseHexColor } from "./colorField.ts";

export function ColorField({
  label,
  pickerLabel,
  value,
  invalidColor,
  onCommit,
}: {
  label: string;
  pickerLabel: string;
  value: string;
  invalidColor: string;
  onCommit: (color: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(false);
  function commit(text: string) {
    const color = parseHexColor(text);
    if (!color) {
      setError(true);
      return;
    }
    setError(false);
    setDraft(color);
    if (color !== value.toLowerCase()) onCommit(color);
  }
  function key(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.value = value;
      setDraft(value);
      setError(false);
      event.currentTarget.blur();
    }
  }
  return (
    <div className="le-editor__field le-editor__field--wide">
      <label htmlFor={id}>{label}</label>
      <div className="le-editor__color">
        <input
          type="color"
          aria-label={`${label} — ${pickerLabel}`}
          value={parseHexColor(draft) ?? value}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={(event) => commit(event.currentTarget.value)}
          onKeyDown={key}
        />
        <input
          id={id}
          type="text"
          value={draft}
          spellCheck={false}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={(event) => commit(event.currentTarget.value)}
          onKeyDown={key}
        />
      </div>
      {error && (
        <p className="le-editor__error" id={`${id}-error`} role="alert">
          {invalidColor}
        </p>
      )}
    </div>
  );
}
