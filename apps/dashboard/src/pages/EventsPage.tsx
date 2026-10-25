import type { UserOrganization } from "@ticketing/contracts";
import { useOutletContext } from "react-router";
import { CreateEventForm } from "../features/events/CreateEventForm.tsx";
import { EventList } from "../features/events/EventList.tsx";

export function EventsPage() {
  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();

  const canEdit =
    organization.role === "owner" || organization.role === "admin";

  return (
    <>
      <h2>Etkinlikler</h2>
      <EventList organizationId={organization.id} role={organization.role} />
      {canEdit && <CreateEventForm organizationId={organization.id} />}
    </>
  );
}
