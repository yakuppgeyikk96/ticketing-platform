import type { EventStatus } from "@ticketing/contracts";
import type { BadgeProps } from "../../components/Badge.tsx";

// Dictionary keys, not sentences: the component that renders calls t().
export const eventStatusLabels: Record<
  EventStatus,
  { labelKey: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  draft: { labelKey: "events.status.draft", variant: "warning" },
  published: { labelKey: "events.status.published", variant: "success" },
  archived: { labelKey: "events.status.archived", variant: "neutral" },
};

export interface EventTransition {
  to: EventStatus;
  labelKey: string;
  variant: "primary" | "secondary" | "danger";
}

// UI copy of the service's transition table: which actions each status offers.
export const eventTransitions: Record<EventStatus, readonly EventTransition[]> =
  {
    draft: [
      {
        to: "published",
        labelKey: "events.action.publish",
        variant: "primary",
      },
    ],
    published: [
      {
        to: "draft",
        labelKey: "events.action.unpublish",
        variant: "secondary",
      },
      { to: "archived", labelKey: "events.action.archive", variant: "danger" },
    ],
    archived: [],
  };

// Problem types this feature phrases for its own context (see describeError).
export const eventStatusMessages = {
  "/problems/invalid-transition": "events.errors.invalidTransition",
};
