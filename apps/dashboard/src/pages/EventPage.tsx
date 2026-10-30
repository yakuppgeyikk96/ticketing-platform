import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventStatus, UserOrganization } from "@ticketing/contracts";
import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import { ApiError } from "../api/client.ts";
import { describeError } from "../api/errors.ts";
import {
  eventKeys,
  eventsQuery,
  getEvent,
  updateEventStatus,
} from "../api/events.ts";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { IconArrowLeft } from "../components/icons/IconArrowLeft.tsx";
import { IconPlus } from "../components/icons/IconPlus.tsx";
import {
  eventStatusLabels,
  eventStatusMessages,
  eventTransitions,
} from "../features/events/eventStatus.ts";
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

  const [creating, setCreating] = useState(false);

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

  const statusChange = useMutation({
    mutationFn: (status: EventStatus) =>
      updateEventStatus(organizationId, eventId, status),
    // Detail and list share the prefix; a 409 means our copy is stale, so refetch on failure too.
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: eventKeys.all(organizationId),
      }),
  });

  const eventsPath = `/organizations/${organizationId}/events`;

  if (event.isPending) return <p>Yükleniyor…</p>;

  if (event.isError) {
    const notFound =
      event.error instanceof ApiError && event.error.status === 404;
    return (
      <>
        <p role="alert">
          {notFound ? "Etkinlik bulunamadı." : describeError(event.error)}
        </p>
        <Link to={eventsPath}>Etkinliklere dön</Link>
      </>
    );
  }

  const canEdit =
    organization.role === "owner" || organization.role === "admin";
  const status = eventStatusLabels[event.data.status];

  return (
    <>
      <header className={styles.header}>
        <Link to={eventsPath} className={styles.back}>
          <IconArrowLeft size="16" />
          Etkinlikler
        </Link>
        <div className={styles.titleRow}>
          <div className={styles.text}>
            <div className={styles.titleLine}>
              <h1>{event.data.title}</h1>
              <Badge variant={status.variant} dot>
                {status.label}
              </Badge>
            </div>
            <p className={styles.meta}>
              <code>{event.data.slug}</code>
              {event.data.description && <span>{event.data.description}</span>}
            </p>
          </div>
          {canEdit && (
            <div className={styles.actions}>
              {eventTransitions[event.data.status].map((action) => (
                <Button
                  key={action.to}
                  variant={action.variant}
                  busy={
                    statusChange.isPending &&
                    statusChange.variables === action.to
                  }
                  disabled={statusChange.isPending}
                  onClick={() => statusChange.mutate(action.to)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        {statusChange.isError && (
          <p role="alert" className={styles.error}>
            {describeError(statusChange.error, eventStatusMessages)}
          </p>
        )}
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Gösterimler</h2>
          {canEdit && (
            <Button
              variant="secondary"
              icon={<IconPlus size="16" />}
              onClick={() => setCreating(true)}
            >
              Yeni gösterim
            </Button>
          )}
        </div>
        <OccurrenceList
          organizationId={organizationId}
          eventId={eventId}
          role={organization.role}
        />
      </section>

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Yeni gösterim"
      >
        <CreateOccurrenceForm
          organizationId={organizationId}
          eventId={eventId}
          onSuccess={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      </Dialog>
    </>
  );
}
