import { useCallback, useSyncExternalStore } from "react";

// Written by Claude (Claude Code), 2026-10-25.
//
// A boolean preference that survives reloads and follows the user across
// tabs. It is a device preference (sidebar open, panel collapsed…), not user
// data: it lives in localStorage and the server never sees it.
export function useStoredFlag(key: string, fallback: boolean) {
  const storageKey = `pref:${key}`;

  const value = useSyncExternalStore(
    subscribe,
    () => read(storageKey) ?? fallback,
    () => fallback,
  );

  const setValue = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      const current = read(storageKey) ?? fallback;
      write(storageKey, typeof next === "function" ? next(current) : next);
    },
    [storageKey, fallback],
  );

  return [value, setValue] as const;
}

// Same-tab writes do not fire the `storage` event, so writers notify these
// listeners themselves; the event covers other tabs.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// localStorage can throw (private mode, blocked site data). The flag then
// still works for the session through this in-memory fallback.
const memory = new Map<string, boolean>();

function read(key: string): boolean | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return raw === "true";
  } catch {
    // fall through to memory
  }
  return memory.get(key) ?? null;
}

function write(key: string, value: boolean) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // memory already holds it
  }
  for (const listener of listeners) listener();
}
