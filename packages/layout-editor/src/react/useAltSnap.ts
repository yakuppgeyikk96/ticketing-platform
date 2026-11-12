import { useEffect } from "react";

/** Refresh an active gesture even if Alt changes while the pointer is stationary. */
export function useAltSnap(change: (pressed: boolean) => boolean) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Alt" || event.isComposing) return;
      if (change(event.type === "keydown")) event.preventDefault();
    };
    const blur = () => {
      change(false);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      window.removeEventListener("blur", blur);
    };
  }, [change]);
}
