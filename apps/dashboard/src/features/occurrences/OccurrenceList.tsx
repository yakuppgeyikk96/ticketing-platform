import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemberRole, OccurrenceStatus, Venue } from "@ticketing/contracts";
import { describeError } from "../../api/errors.ts";
import {
  occurrenceKeys,
  occurrencesQuery,
  updateOccurrenceStatus,
} from "../../api/occurrences.ts";
import { venuesQuery } from "../../api/venues.ts";
import { Button } from "../../components/Button.tsx";
import styles from "./OccurrenceList.module.css";

interface OccurrenceListProps {
  organizationId: string;
  eventId: string;
  role: MemberRole;
}

const statusLabels: Record<OccurrenceStatus, string> = {
  draft: "Taslak",
  on_sale: "Satışta",
  sold_out: "Tükendi",
  cancelled: "İptal",
  ended: "Bitti",
};

// UI copy of the service's manual transitions; system-owned statuses show nothing.
const actions: Record<
  OccurrenceStatus,
  readonly {
    to: OccurrenceStatus;
    label: string;
    variant: "primary" | "secondary" | "danger";
  }[]
> = {
  draft: [
    { to: "on_sale", label: "Satışa aç", variant: "primary" },
    { to: "cancelled", label: "İptal et", variant: "danger" },
  ],
  on_sale: [
    { to: "draft", label: "Taslağa çek", variant: "secondary" },
    { to: "cancelled", label: "İptal et", variant: "danger" },
  ],
  sold_out: [],
  cancelled: [],
  ended: [],
};

const statusMessages = {
  "/problems/invalid-transition":
    "Gösterim bu arada değişmiş; liste yenilendi, tekrar dene",
  "/problems/event-not-published": "Önce etkinliği yayınla",
};

// An instant is shown in the venue's zone, whatever the viewer's clock says.
function formatInVenue(iso: string, venue: Venue | undefined): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: venue?.timezone,
  }).format(new Date(iso));
}

export function OccurrenceList({
  organizationId,
  eventId,
  role,
}: OccurrenceListProps) {
  const queryClient = useQueryClient();

  const occurrences = useQuery(occurrencesQuery(organizationId, eventId));
  // Venue names and zones for the rows; the same query the create form uses.
  const venues = useQuery(venuesQuery(organizationId));

  const statusChange = useMutation({
    mutationFn: ({
      occurrenceId,
      status,
    }: {
      occurrenceId: string;
      status: OccurrenceStatus;
    }) => updateOccurrenceStatus(organizationId, eventId, occurrenceId, status),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: occurrenceKeys.all(organizationId, eventId),
      }),
  });

  if (occurrences.isPending) return <p>Yükleniyor…</p>;
  if (occurrences.isError) {
    return <p role="alert">{describeError(occurrences.error)}</p>;
  }
  if (occurrences.data.length === 0) return <p>Henüz gösterim yok.</p>;

  const canEdit = role === "owner" || role === "admin";
  const venueById = new Map(venues.data?.map((v) => [v.id, v]));

  return (
    <ul role="list">
      {occurrences.data.map((occurrence) => {
        const venue = venueById.get(occurrence.venueId);
        const inFlight = statusChange.variables?.occurrenceId === occurrence.id;
        const changing = statusChange.isPending && inFlight;
        const failed = statusChange.isError && inFlight;
        return (
          <li
            key={occurrence.id}
            className={[styles.row, changing && styles.changing]
              .filter(Boolean)
              .join(" ")}
          >
            <div className={styles.when}>
              <time dateTime={occurrence.startsAt}>
                {formatInVenue(occurrence.startsAt, venue)}
              </time>
              {occurrence.endsAt && (
                <span className={styles.until}>
                  {" → "}
                  <time dateTime={occurrence.endsAt}>
                    {formatInVenue(occurrence.endsAt, venue)}
                  </time>
                </span>
              )}
            </div>
            <span className={styles.venue}>
              {venue?.name ?? "…"}
              {venue && <small> {venue.timezone}</small>}
            </span>
            <span
              className={[styles.status, styles[occurrence.status]].join(" ")}
            >
              {statusLabels[occurrence.status]}
            </span>
            {canEdit &&
              actions[occurrence.status].map((action) => (
                <Button
                  key={action.to}
                  variant={action.variant}
                  busy={changing && statusChange.variables.status === action.to}
                  disabled={statusChange.isPending}
                  onClick={() =>
                    statusChange.mutate({
                      occurrenceId: occurrence.id,
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
