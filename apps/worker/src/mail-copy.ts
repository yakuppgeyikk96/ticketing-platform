import type { Locale } from "@ticketing/contracts";

interface MailCopy {
  subject: string;
  html: string;
}

// One entry per language per mail. Kept as plain strings on purpose: a
// template engine earns its place when the second mail arrives.
export const welcomeMail: Record<Locale, MailCopy> = {
  tr: {
    subject: "Hoş geldiniz",
    html: "<p>Hesabınız oluşturuldu, hoş geldiniz.</p>",
  },
  en: {
    subject: "Welcome",
    html: "<p>Your account has been created. Welcome aboard.</p>",
  },
};
