import { useQuery } from "@tanstack/react-query";
import { describeError } from "../api/errors.ts";
import { venuesQuery } from "../api/venues.ts";
import styles from "./VenueList.module.css";

const people = new Intl.NumberFormat("tr-TR");

export function VenueList({ organizationId }: { organizationId: string }) {
  const venues = useQuery(venuesQuery(organizationId));

  if (venues.isPending) return <p>Yükleniyor…</p>;
  if (venues.isError) {
    return <p role="alert">{describeError(venues.error)}</p>;
  }
  if (venues.data.length === 0) return <p>Henüz mekân yok.</p>;

  return (
    <ul role="list">
      {venues.data.map((venue) => (
        <li key={venue.id} className={styles.row}>
          <span className={styles.name}>{venue.name}</span>
          {venue.city && <span className={styles.meta}>{venue.city}</span>}
          <code className={styles.meta}>{venue.timezone}</code>
          {venue.capacity !== null && (
            <span className={styles.meta}>
              {people.format(venue.capacity)} kişi
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
