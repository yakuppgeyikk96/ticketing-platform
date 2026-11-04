import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MemberRole,
  Occurrence,
  OccurrenceStatus,
} from "@ticketing/contracts";
import { useTranslation } from "react-i18next";
import { describeError } from "../../api/errors.ts";
import {
  occurrenceKeys,
  occurrencesQuery,
  updateOccurrenceStatus,
} from "../../api/occurrences.ts";
import { ActionMenu } from "../../components/ActionMenu.tsx";
import { Badge, type BadgeProps } from "../../components/Badge.tsx";
import { Dropdown } from "../../components/Dropdown.tsx";
import { Table, type TableColumn } from "../../components/Table.tsx";
import { localeTag } from "../../i18n/index.ts";
import styles from "./OccurrenceList.module.css";

interface OccurrenceListProps {
  organizationId: string;
  eventId: string;
  role: MemberRole;
}

// Dictionary keys, not sentences: resolved with t() where they render.
const statusLabels: Record<
  OccurrenceStatus,
  { labelKey: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  draft: { labelKey: "occurrences.status.draft", variant: "warning" },
  on_sale: { labelKey: "occurrences.status.on_sale", variant: "success" },
  sold_out: { labelKey: "occurrences.status.sold_out", variant: "accent" },
  cancelled: { labelKey: "occurrences.status.cancelled", variant: "danger" },
  ended: { labelKey: "occurrences.status.ended", variant: "neutral" },
};

// UI copy of the service's manual transitions; system-owned statuses offer nothing.
const actions: Record<
  OccurrenceStatus,
  readonly { to: OccurrenceStatus; labelKey: string; danger?: boolean }[]
> = {
  draft: [
    { to: "on_sale", labelKey: "occurrences.action.openSale" },
    { to: "cancelled", labelKey: "occurrences.action.cancel", danger: true },
  ],
  on_sale: [
    { to: "draft", labelKey: "occurrences.action.unpublish" },
    { to: "cancelled", labelKey: "occurrences.action.cancel", danger: true },
  ],
  sold_out: [],
  cancelled: [],
  ended: [],
};

// Problem types this list phrases for its own context (see describeError).
const statusMessages = {
  "/problems/invalid-transition": "occurrences.errors.invalidTransition",
};

// An instant is shown in the venue's zone, whatever the viewer's clock says,
// and in the viewer's language.
function formatInVenue(iso: string, timezone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(iso));
}

export function OccurrenceList({
  organizationId,
  eventId,
  role,
}: OccurrenceListProps) {
  const { t, i18n } = useTranslation();
  const locale = localeTag(i18n.language);
  const queryClient = useQueryClient();

  const occurrences = useQuery(occurrencesQuery(organizationId, eventId));

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

  const columns: TableColumn<Occurrence>[] = [
    {
      key: "startsAt",
      title: t("occurrences.column.date"),
      render: (startsAt: string, occurrence) => {
        const venue = occurrence.space.venue;
        const failed =
          statusChange.isError &&
          statusChange.variables.occurrenceId === occurrence.id;
        return (
          <div className={styles.cell}>
            <span className={styles.when}>
              <time dateTime={startsAt}>
                {formatInVenue(startsAt, venue.timezone, locale)}
              </time>
              {occurrence.endsAt && (
                <span className={styles.until}>
                  {" → "}
                  <time dateTime={occurrence.endsAt}>
                    {formatInVenue(occurrence.endsAt, venue.timezone, locale)}
                  </time>
                </span>
              )}
            </span>
            <span className={styles.sub}>{venue.timezone}</span>
            {failed && (
              <p role="alert" className={styles.error}>
                {describeError(statusChange.error, t, statusMessages)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "space",
      title: t("occurrences.column.venue"),
      render: (space: Occurrence["space"]) => {
        return (
          <div className={styles.cell}>
            <span>{space.venue.name}</span>
            <span className={styles.sub}>{space.name}</span>
          </div>
        );
      },
    },
    {
      key: "status",
      title: t("occurrences.column.status"),
      render: (status: OccurrenceStatus) => (
        <Badge variant={statusLabels[status].variant} dot>
          {t(statusLabels[status].labelKey)}
        </Badge>
      ),
    },
  ];

  if (canEdit) {
    columns.push({
      id: "actions",
      title: t("common.actions"),
      hideTitle: true,
      align: "end",
      render: (occurrence: Occurrence) => {
        const available = actions[occurrence.status];
        if (available.length === 0) return null;
        return (
          <ActionMenu label={t("occurrences.rowActions")}>
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
                {t(action.labelKey)}
              </Dropdown.Item>
            ))}
          </ActionMenu>
        );
      },
    });
  }

  if (occurrences.isPending) return <p>{t("common.loading")}</p>;
  if (occurrences.isError) {
    return <p role="alert">{describeError(occurrences.error, t)}</p>;
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
      emptyMessage={t("occurrences.empty")}
      footer={t("occurrences.count", { count: occurrences.data.length })}
    />
  );
}
