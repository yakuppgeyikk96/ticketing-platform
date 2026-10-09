import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ApiError } from "../api/client.ts";
import { describeError } from "../api/errors.ts";
import {
  getOrganization,
  myOrganizationsQuery,
  organizationKeys,
} from "../api/organizations.ts";
import { AddMemberForm } from "./AddMemberForm.tsx";
import { MemberList } from "./MemberList.tsx";

export function OrganizationPage() {
  const { organizationId } = useParams();
  // The route pattern guarantees the param; a missing one is a routing bug.
  if (!organizationId) throw new Error("route param organizationId missing");

  const queryClient = useQueryClient();
  const organization = useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: () => getOrganization(organizationId),
    // Coming from the list, the same shape is already cached: show it at once.
    // Placeholder, not initialData: the real answer is still fetched, and
    // nothing from another query is written into this one's cache.
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

  return (
    <>
      <p>
        <Link to="/organizations">← Organizasyonlarım</Link>
      </p>
      <h1>{organization.data.name}</h1>
      <p>
        <code>{organization.data.slug}</code> · rolün:{" "}
        <strong>{organization.data.role}</strong>
      </p>

      <h2>Üyeler</h2>
      <MemberList
        organizationId={organizationId}
        role={organization.data.role}
      />
      {(organization.data.role === "owner" ||
        organization.data.role === "admin") && (
        <AddMemberForm organizationId={organizationId} />
      )}
    </>
  );
}
