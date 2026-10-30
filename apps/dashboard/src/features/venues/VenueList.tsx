import { useQuery } from "@tanstack/react-query";
import type { Venue } from "@ticketing/contracts";
import { describeError } from "../../api/errors.ts";
import { venuesQuery } from "../../api/venues.ts";
import { Table, type TableColumn } from "../../components/Table.tsx";
import { matchesQuery } from "../../lib/search.ts";
import styles from "./VenueList.module.css";

interface VenueListProps {
  organizationId: string;
  query?: string;
}

const people = new Intl.NumberFormat("tr-TR");

// No mutations on venues yet, so no actions column.
const columns: TableColumn<Venue>[] = [
  {
    key: "name",
    title: "Mekân",
    render: (name: string, venue) => (
      <div className={styles.cell}>
        <span className={styles.name}>{name}</span>
        <code className={styles.slug}>{venue.slug}</code>
      </div>
    ),
  },
  {
    key: "city",
    title: "Şehir",
    render: (city: string | null) => city ?? "—",
  },
  {
    key: "timezone",
    title: "Saat dilimi",
    render: (timezone: string) => (
      <code className={styles.timezone}>{timezone}</code>
    ),
  },
  {
    key: "capacity",
    title: "Kapasite",
    align: "end",
    render: (capacity: number | null) =>
      capacity === null ? "—" : `${people.format(capacity)} kişi`,
  },
];

export function VenueList({ organizationId, query = "" }: VenueListProps) {
  const venues = useQuery(venuesQuery(organizationId));

  if (venues.isPending) return <p>Yükleniyor…</p>;
  if (venues.isError) {
    return <p role="alert">{describeError(venues.error)}</p>;
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
      emptyMessage={
        filtered ? "Aramayla eşleşen mekân yok." : "Henüz bir mekân yok."
      }
      footer={
        filtered
          ? `${rows.length} / ${venues.data.length} mekân`
          : `${rows.length} mekân`
      }
    />
  );
}
