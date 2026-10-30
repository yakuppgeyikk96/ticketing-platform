// Order matters: tokens first (plain custom properties), then the layered reset.
import "@ticketing/design/tokens.css";
import "@ticketing/design/reset.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Etkinlikler",
  description: "Yaklaşan etkinlikler ve biletler",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
