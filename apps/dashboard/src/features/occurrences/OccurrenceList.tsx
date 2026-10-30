import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MemberRole,
  Occurrence,
  OccurrenceStatus,
  Venue,
} from "@ticketing/contracts";
import { describeError } from "../../api/errors.ts";
import {
  occurrenceKeys,
  occurrencesQuery,
  updateOccurrenceStatus,
} from "../../api/occurrences.ts";
import { venuesQuery } from "../../api/venues.ts";
import { ActionMenu } from "../../components/ActionMenu.tsx";
import { Badge, type BadgeProps } from "../../components/Badge.tsx";
import { Dropdown } from "../../components/Dropdown.tsx";
import { Table, type TableColumn } from "../../components/Table.tsx";
import styles from "./OccurrenceList.module.css";

interface OccurrenceListProps {
  organizationId: string;
  eventId: string;
  role: MemberRole;
}

const statusLabels: Record<
  OccurrenceStatus,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  draft: { label: "Taslak", variant: "warning" },
  on_sale: { label: "Satışta", variant: "success" },
  sold_out: { label: "Tükendi", variant: "accent" },
  cancelled: { label: "İptal", variant: "danger" },
  ended: { label: "Bitti", variant: "neutral" },
};

// UI copy of the service's manual transitions; system-owned statuses offer nothing.
const actions: Record<
  OccurrenceStatus,
  readonly { to: OccurrenceStatus; label: string; danger?: boolean }[]
> = {
  draft: [
    { to: "on_sale", label: "Satışa aç" },
    { to: "cancelled", label: "İptal et", danger: true },
  ],
  on_sale: [
    { to: "draft", label: "Taslağa çek" },
    { to: "cancelled", label: "İptal et", danger: true },
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

  const canEdit = role === "owner" || role === "admin";
  const venueById = new Map(venues.data?.map((v) => [v.id, v]));

  const columns: TableColumn<Occurrence>[] = [
    {
      key: "startsAt",
      title: "Tarih",
      render: (startsAt: string, occurrence) => {
        const venue = venueById.get(occurrence.venueId);
        const failed =
          statusChange.isError &&
          statusChange.variables.occurrenceId === occurrence.id;
        return (
          <div className={styles.cell}>
            <span className={styles.when}>
              <time dateTime={startsAt}>{formatInVenue(startsAt, venue)}</time>
              {occurrence.endsAt && (
                <span className={styles.until}>
                  {" → "}
                  <time dateTime={occurrence.endsAt}>
                    {formatInVenue(occurrence.endsAt, venue)}
                  </time>
                </span>
              )}
            </span>
            {venue && <span className={styles.sub}>{venue.timezone}</span>}
            {failed && (
              <p role="alert" className={styles.error}>
                {describeError(statusChange.error, statusMessages)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "venueId",
      title: "Mekân",
      render: (venueId: string) => {
        const venue = venueById.get(venueId);
        if (!venue) return "…";
        return (
          <div className={styles.cell}>
            <span>{venue.name}</span>
            {venue.city && <span className={styles.sub}>{venue.city}</span>}
          </div>
        );
      },
    },
    {
      key: "status",
      title: "Durum",
      render: (status: OccurrenceStatus) => (
        <Badge variant={statusLabels[status].variant} dot>
          {statusLabels[status].label}
        </Badge>
      ),
    },
  ];

  if (canEdit) {
    columns.push({
      id: "actions",
      title: "İşlemler",
      hideTitle: true,
      align: "end",
      render: (occurrence: Occurrence) => {
        const available = actions[occurrence.status];
        if (available.length === 0) return null;
        return (
          <ActionMenu label="Gösterim işlemleri">
            {available.map((action) => (
              <Dropdown.Item
                key={action.to}
                danger={action.danger ?? false}
                disabled={statusChange.isPending}
                onClick={() =>
                  statusChange.mutate({
                    occurrenceId: occurrence.id,
                    status: action.to,
                  })
                }
              >
                {action.label}
              </Dropdown.Item>
            ))}
          </ActionMenu>
        );
      },
    });
  }

  if (occurrences.isPending) return <p>Yükleniyor…</p>;
  if (occurrences.isError) {
    return <p role="alert">{describeError(occurrences.error)}</p>;
  }

  return (
    <Table
      columns={columns}
      data={occurrences.data}
      rowKey="id"
      rowClassName={(occurrence) =>
        statusChange.isPending &&
        statusChange.variables.occurrenceId === occurrence.id &&
        styles.changing
      }
      emptyMessage="Henüz gösterim yok."
      footer={`${occurrences.data.length} gösterim`}
    />
  );
}
