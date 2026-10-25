import type { UserOrganization } from "@ticketing/contracts";
import { useOutletContext } from "react-router";
import { CreateVenueForm } from "../features/venues/CreateVenueForm.tsx";
import { VenueList } from "../features/venues/VenueList.tsx";

export function VenuesPage() {
  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();

  const canEdit =
    organization.role === "owner" || organization.role === "admin";

  return (
    <>
      <h2>Mekânlar</h2>
      <VenueList organizationId={organization.id} />
      {canEdit && <CreateVenueForm organizationId={organization.id} />}
    </>
  );
}
