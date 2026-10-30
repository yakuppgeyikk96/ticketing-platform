import type { EventStatus } from "@ticketing/contracts";
import type { BadgeProps } from "../../components/Badge.tsx";

export const eventStatusLabels: Record<
  EventStatus,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  draft: { label: "Taslak", variant: "warning" },
  published: { label: "Yayında", variant: "success" },
  archived: { label: "Arşiv", variant: "neutral" },
};

export interface EventTransition {
  to: EventStatus;
  label: string;
  variant: "primary" | "secondary" | "danger";
}

// UI copy of the service's transition table: which actions each status offers.
export const eventTransitions: Record<EventStatus, readonly EventTransition[]> =
  {
    draft: [{ to: "published", label: "Yayınla", variant: "primary" }],
    published: [
      { to: "draft", label: "Taslağa çek", variant: "secondary" },
      { to: "archived", label: "Arşivle", variant: "danger" },
    ],
    archived: [],
  };

export const eventStatusMessages = {
  "/problems/invalid-transition":
    "Etkinlik bu arada değişmiş; veriler yenilendi, tekrar dene",
};
