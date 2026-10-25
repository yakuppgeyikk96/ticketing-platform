import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ApiError } from "../api/client.ts";
import { describeError } from "../api/errors.ts";
import { eventKeys, eventsQuery, getEvent } from "../api/events.ts";
import {
  getOrganization,
  myOrganizationsQuery,
  organizationKeys,
} from "../api/organizations.ts";
import { CreateOccurrenceForm } from "../features/occurrences/CreateOccurrenceForm.tsx";
import { OccurrenceList } from "../features/occurrences/OccurrenceList.tsx";
import styles from "./EventPage.module.css";

export function EventPage() {
  const { organizationId, eventId } = useParams();
  if (!organizationId || !eventId) {
    throw new Error("route params organizationId/eventId missing");
  }

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

  // The event does not carry the viewer's role; the organization does. Until it
  // arrives the page behaves as the least privileged role and shows no buttons.
  const organization = useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: () => getOrganization(organizationId),
    placeholderData: () =>
      queryClient
        .getQueryData(myOrganizationsQuery.queryKey)
        ?.find((org) => org.id === organizationId),
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
        <Link to={`/organizations/${organizationId}`}>Organizasyona dön</Link>
      </>
    );
  }

  const role = organization.data?.role ?? "staff";
  const canEdit = role === "owner" || role === "admin";

  return (
    <>
      <header className={styles.header}>
        <Link to={`/organizations/${organizationId}`}>← Organizasyon</Link>
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
          role={role}
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
