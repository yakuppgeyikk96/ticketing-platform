import { useQueryClient } from "@tanstack/react-query";
import type { CurrentUser, Locale } from "@ticketing/contracts";
import { useTranslation } from "react-i18next";
import { updateMe } from "../api/auth.ts";
import { sessionKey } from "../features/auth/useSession.ts";
import { applyLocale, asLocale } from "./index.ts";

// The current language and the one way to change it from the UI. Switches
// the screen first; the account's preference follows when someone is signed in.
export function useLocale() {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const locale = asLocale(i18n.language);

  async function setLocale(next: Locale): Promise<void> {
    if (next === locale) return;
    await applyLocale(next);

    // No session, no server-side preference to update.
    if (!queryClient.getQueryData<CurrentUser>(sessionKey)) return;

    try {
      const user = await updateMe({ locale: next });
      queryClient.setQueryData(sessionKey, user);
    } catch {
      // The screen already switched; the account catches up on the next change.
    }
  }

  return { locale, setLocale } as const;
}
