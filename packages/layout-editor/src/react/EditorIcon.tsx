export function EditorIcon({
  name,
}: {
  name: "rectangle" | "delete" | "selection" | "draw";
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === "rectangle" && (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M9 12h6m-3-3v6" />
        </>
      )}
      {name === "delete" && (
        <>
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5" />
        </>
      )}
      {name === "selection" && <path d="m5 3 14 10-7 1-3 7-4-18Z" />}
      {name === "draw" && (
        <>
          <rect x="5" y="5" width="14" height="14" rx="1" />
          <path d="M2 5h6M5 2v6m11 11h6m-3-3v6" />
        </>
      )}
    </svg>
  );
}
