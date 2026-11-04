import { useQuery } from "@tanstack/react-query";
import type { Venue } from "@ticketing/contracts";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { describeError } from "../../api/errors.ts";
import { venuesQuery } from "../../api/venues.ts";
import { Table, type TableColumn } from "../../components/Table.tsx";
import { localeTag } from "../../i18n/index.ts";
import { matchesQuery } from "../../lib/search.ts";
import styles from "./VenueList.module.css";

interface VenueListProps {
  organizationId: string;
  query?: string;
}

export function VenueList({ organizationId, query = "" }: VenueListProps) {
  const { t, i18n } = useTranslation();
  const venues = useQuery(venuesQuery(organizationId));

  // Thousands separators follow the viewer's language, so the formatter is
  // built per render; it is cheap and the list is small.
  const people = new Intl.NumberFormat(localeTag(i18n.language));

  // No mutations on venues yet, so no actions column.
  const columns: TableColumn<Venue>[] = [
    {
      key: "name",
      title: t("venues.column.name"),
      render: (name: string, venue) => (
        <div className={styles.cell}>
          <Link
            className={styles.name}
            to={`/organizations/${organizationId}/venues/${venue.id}`}
          >
            {name}
          </Link>
          <code className={styles.slug}>{venue.slug}</code>
        </div>
      ),
    },
    {
      key: "city",
      title: t("venues.column.city"),
      render: (city: string | null) => city ?? "—",
    },
    {
      key: "timezone",
      title: t("venues.column.timezone"),
      render: (timezone: string) => (
        <code className={styles.timezone}>{timezone}</code>
      ),
    },
    {
      key: "capacity",
      title: t("venues.column.capacity"),
      align: "end",
      render: (capacity: number | null) =>
        capacity === null
          ? "—"
          : t("venues.capacity", {
              count: capacity,
              n: people.format(capacity),
            }),
    },
  ];

  if (venues.isPending) return <p>{t("common.loading")}</p>;
  if (venues.isError) {
    return <p role="alert">{describeError(venues.error, t)}</p>;
  }

  const rows = venues.data.filter((venue) =>
    matchesQuery(query, venue.name, venue.slug, venue.city ?? ""),
  );
  const filtered = rows.length !== venues.data.length;

  return (
    <Table
      columns={columns}
      data={rows}
      rowKey="id"
      emptyMessage={filtered ? t("venues.emptyFiltered") : t("venues.empty")}
      footer={
        filtered
          ? t("venues.countFiltered", {
              shown: rows.length,
              total: venues.data.length,
            })
          : t("venues.count", { count: rows.length })
      }
    />
  );
}
