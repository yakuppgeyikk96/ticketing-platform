import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserOrganization } from "@ticketing/contracts";
import { Link, useOutletContext, useParams } from "react-router";
import { ApiError } from "../api/client.ts";
import { describeError } from "../api/errors.ts";
import { eventKeys, eventsQuery, getEvent } from "../api/events.ts";
import { CreateOccurrenceForm } from "../features/occurrences/CreateOccurrenceForm.tsx";
import { OccurrenceList } from "../features/occurrences/OccurrenceList.tsx";
import styles from "./EventPage.module.css";

export function EventPage() {
  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();
  const organizationId = organization.id;

  const { eventId } = useParams();
  if (!eventId) throw new Error("route param eventId missing");

  const queryClient = useQueryClient();
  const event = useQuery({
    queryKey: eventKeys.detail(organizationId, eventId),
    queryFn: () => getEvent(organizationId, eventId),
    // Coming from the list, show the cached row at once; the real fetch still runs.
    placeholderData: () =>
      queryClient
        .getQueryData(eventsQuery(organizationId).queryKey)
        ?.find((e) => e.id === eventId),
  });

  if (event.isPending) return <p>Yükleniyor…</p>;

  if (event.isError) {
    const notFound =
      event.error instanceof ApiError && event.error.status === 404;
    return (
      <>
        <p role="alert">
          {notFound ? "Etkinlik bulunamadı." : describeError(event.error)}
        </p>
        <Link to={`/organizations/${organizationId}/events`}>
          Etkinliklere dön
        </Link>
      </>
    );
  }

  const canEdit =
    organization.role === "owner" || organization.role === "admin";

  return (
    <>
      <header className={styles.header}>
        <Link to={`/organizations/${organizationId}/events`}>
          ← Etkinlikler
        </Link>
        <h1>{event.data.title}</h1>
        <p className={styles.meta}>
          <code>{event.data.slug}</code>
          <span>{event.data.status}</span>
        </p>
        {event.data.description && <p>{event.data.description}</p>}
      </header>

      <section className={styles.section}>
        <h2>Gösterimler</h2>
        <OccurrenceList
          organizationId={organizationId}
          eventId={eventId}
          role={organization.role}
        />
        {canEdit && (
          <CreateOccurrenceForm
            organizationId={organizationId}
            eventId={eventId}
          />
        )}
      </section>
    </>
  );
}
