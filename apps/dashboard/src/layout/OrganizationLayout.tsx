import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserOrganization } from "@ticketing/contracts";
import { Link, Outlet, useParams } from "react-router";
import { ApiError } from "../api/client.ts";
import { describeError } from "../api/errors.ts";
import {
  getOrganization,
  myOrganizationsQuery,
  organizationKeys,
} from "../api/organizations.ts";

export function OrganizationLayout() {
  const { organizationId } = useParams();
  if (!organizationId) throw new Error("route param organizationId missing");

  const queryClient = useQueryClient();
  const organization = useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: () => getOrganization(organizationId),
    placeholderData: () =>
      queryClient
        .getQueryData(myOrganizationsQuery.queryKey)
        ?.find((org) => org.id === organizationId),
  });

  if (organization.isPending) {
    return <p>Yükleniyor…</p>;
  }

  if (organization.isError) {
    const notFound =
      organization.error instanceof ApiError &&
      organization.error.status === 404;
    return (
      <>
        <p role="alert">
          {notFound
            ? "Organizasyon bulunamadı."
            : describeError(organization.error)}
        </p>
        <Link to="/organizations">Organizasyonlarıma dön</Link>
      </>
    );
  }

  const context: { organization: UserOrganization } = {
    organization: organization.data,
  };
  return <Outlet context={context} />;
}
