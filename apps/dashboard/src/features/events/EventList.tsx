import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventStatus, MemberRole } from "@ticketing/contracts";
import { Link } from "react-router";
import styles from "./EventList.module.css";
import { eventKeys, eventsQuery, updateEventStatus } from "../../api/events.ts";
import { describeError } from "../../api/errors.ts";
import { Button } from "../../components/Button.tsx";

interface EventListProps {
  organizationId: string;
  // The caller's role, for showing or hiding controls. The server decides for real.
  role: MemberRole;
}

const statusLabels: Record<EventStatus, string> = {
  draft: "Taslak",
  published: "Yayında",
  archived: "Arşiv",
};

// UI copy of the service's transition table: which buttons each status shows.
const actions: Record<
  EventStatus,
  readonly {
    to: EventStatus;
    label: string;
    variant: "primary" | "secondary" | "danger";
  }[]
> = {
  draft: [{ to: "published", label: "Yayınla", variant: "primary" }],
  published: [
    { to: "draft", label: "Taslağa çek", variant: "secondary" },
    { to: "archived", label: "Arşivle", variant: "danger" },
  ],
  archived: [],
};

const statusMessages = {
  "/problems/invalid-transition":
    "Etkinlik bu arada değişmiş; liste yenilendi, tekrar dene",
};

export function EventList({ organizationId, role }: EventListProps) {
  const queryClient = useQueryClient();

  const events = useQuery(eventsQuery(organizationId));

  const statusChange = useMutation({
    mutationFn: ({
      eventId,
      status,
    }: {
      eventId: string;
      status: EventStatus;
    }) => updateEventStatus(organizationId, eventId, status),
    // Refetch on failure too: a 409 means our copy of the list is stale.
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: eventKeys.all(organizationId),
      }),
  });

  if (events.isPending) {
    return <p>Yükleniyor…</p>;
  }

  if (events.isError) {
    return <p role="alert">{describeError(events.error)}</p>;
  }

  if (events.data.length === 0) {
    return <p>Henüz etkinlik yok.</p>;
  }

  const canEdit = role === "owner" || role === "admin";

  return (
    <ul role="list">
      {events.data.map((event) => {
        const inFlight = statusChange.variables?.eventId === event.id;
        const changing = statusChange.isPending && inFlight;
        const failed = statusChange.isError && inFlight;
        return (
          <li
            key={event.id}
            className={[styles.row, changing && styles.changing]
              .filter(Boolean)
              .join(" ")}
          >
            <Link
              to={`/organizations/${organizationId}/events/${event.id}`}
              className={styles.title}
            >
              {event.title}
            </Link>
            <span className={[styles.status, styles[event.status]].join(" ")}>
              {statusLabels[event.status]}
            </span>
            {canEdit &&
              actions[event.status].map((action) => (
                <Button
                  key={action.to}
                  variant={action.variant}
                  busy={changing && statusChange.variables.status === action.to}
                  disabled={statusChange.isPending}
                  onClick={() =>
                    statusChange.mutate({
                      eventId: event.id,
                      status: action.to,
                    })
                  }
                >
                  {action.label}
                </Button>
              ))}
            {failed && (
              <p role="alert" className={styles.error}>
                {describeError(statusChange.error, statusMessages)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
