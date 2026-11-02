import type { Locale } from "@ticketing/contracts";

// Picks the UI language from an Accept-Language header. We only speak two
// languages, so the first tag that matches one of them wins; Turkish is the
// default because it is the product's home market.
export function pickLocale(acceptLanguage: string | undefined): Locale {
  if (!acceptLanguage) return "tr";

  for (const part of acceptLanguage.split(",")) {
    const tag = part.trim().split(";")[0]?.toLowerCase() ?? "";
    if (tag === "en" || tag.startsWith("en-")) return "en";
    if (tag === "tr" || tag.startsWith("tr-")) return "tr";
  }

  return "tr";
}
