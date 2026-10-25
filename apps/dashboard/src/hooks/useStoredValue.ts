// Adapted from useStoredFlag hook

import { useCallback, useSyncExternalStore } from "react";

export function useStoredValue(key: string, fallback: string) {
  const storageKey = `pref:${key}`;

  const value = useSyncExternalStore(
    subscribe,
    () => read(storageKey) ?? fallback,
    () => fallback,
  );

  const setValue = useCallback(
    (next: string | ((current: string) => string)) => {
      const current = read(storageKey) ?? fallback;
      write(storageKey, typeof next === "function" ? next(current) : next);
    },
    [storageKey, fallback],
  );

  return [value, setValue] as const;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return raw;
  } catch {
    // fall through to memory
  }
  return memory.get(key) ?? null;
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // memory already holds it
  }
  for (const listener of listeners) listener();
}
