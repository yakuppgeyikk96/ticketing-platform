import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Event, EventStatus, MemberRole } from "@ticketing/contracts";
import { Link } from "react-router";
import styles from "./EventList.module.css";
import {
  eventStatusLabels,
  eventStatusMessages,
  eventTransitions,
} from "./eventStatus.ts";
import { eventKeys, eventsQuery, updateEventStatus } from "../../api/events.ts";
import { describeError } from "../../api/errors.ts";
import { ActionMenu } from "../../components/ActionMenu.tsx";
import { Badge } from "../../components/Badge.tsx";
import { Dropdown } from "../../components/Dropdown.tsx";
import { Table, type TableColumn } from "../../components/Table.tsx";
import { matchesQuery } from "../../lib/search.ts";

export type EventStatusFilter = EventStatus | "all";

interface EventListProps {
  organizationId: string;
  // The caller's role, for showing or hiding controls. The server decides for real.
  role: MemberRole;
  query?: string;
  status?: EventStatusFilter;
}

export function EventList({
  organizationId,
  role,
  query = "",
  status = "all",
}: EventListProps) {
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

  const canEdit = role === "owner" || role === "admin";

  const columns: TableColumn<Event>[] = [
    {
      key: "title",
      title: "Etkinlik",
      render: (title: string, event) => {
        const failed =
          statusChange.isError && statusChange.variables.eventId === event.id;
        return (
          <div className={styles.cell}>
            <Link
              to={`/organizations/${organizationId}/events/${event.id}`}
              className={styles.title}
            >
              {title}
            </Link>
            <code className={styles.slug}>{event.slug}</code>
            {failed && (
              <p role="alert" className={styles.error}>
                {describeError(statusChange.error, eventStatusMessages)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      title: "Durum",
      render: (status: EventStatus) => (
        <Badge variant={eventStatusLabels[status].variant} dot>
          {eventStatusLabels[status].label}
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
      render: (event: Event) => {
        const available = eventTransitions[event.status];
        if (available.length === 0) return null;
        return (
          <ActionMenu label={`${event.title} işlemleri`}>
            {available.map((action) => (
              <Dropdown.Item
                key={action.to}
                danger={action.variant === "danger"}
                disabled={statusChange.isPending}
                onClick={() =>
                  statusChange.mutate({ eventId: event.id, status: action.to })
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

  if (events.isPending) {
    return <p>Yükleniyor…</p>;
  }

  if (events.isError) {
    return <p role="alert">{describeError(events.error)}</p>;
  }

  const rows = events.data.filter(
    (event) =>
      (status === "all" || event.status === status) &&
      matchesQuery(query, event.title, event.slug, event.description ?? ""),
  );
  const filtered = rows.length !== events.data.length;

  return (
    <Table
      columns={columns}
      data={rows}
      rowKey="id"
      rowClassName={(event) =>
        statusChange.isPending &&
        statusChange.variables.eventId === event.id &&
        styles.changing
      }
      emptyMessage={
        filtered ? "Filtreyle eşleşen etkinlik yok." : "Henüz bir etkinlik yok."
      }
      footer={
        filtered
          ? `${rows.length} / ${events.data.length} etkinlik`
          : `${rows.length} etkinlik`
      }
    />
  );
}
