export function DemoIcon({
  name,
}: {
  name: "open" | "export" | "undo" | "redo" | "layout";
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
      {name === "open" && (
        <>
          <path d="M3 7V5h6l2 2h10v12H3V7Z" />
          <path d="M3 10h18" />
        </>
      )}
      {name === "export" && (
        <>
          <path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5" />
        </>
      )}
      {name === "undo" && (
        <>
          <path d="m8 5-5 5 5 5M3 10h11a6 6 0 0 1 0 12" />
        </>
      )}
      {name === "redo" && (
        <>
          <path d="m16 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12" />
        </>
      )}
      {name === "layout" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M3 9h18M15 9v12" />
        </>
      )}
    </svg>
  );
}
