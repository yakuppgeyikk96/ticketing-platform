import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ApiError } from "../api/client.ts";
import { describeError } from "../api/errors.ts";
import {
  getOrganization,
  listMembers,
  organizationKeys,
} from "../api/organizations.ts";

export function OrganizationPage() {
  const { organizationId } = useParams();
  // The route pattern guarantees the param; a missing one is a routing bug.
  if (!organizationId) throw new Error("route param organizationId missing");

  const organization = useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: () => getOrganization(organizationId),
  });
  const members = useQuery({
    queryKey: organizationKeys.members(organizationId),
    queryFn: () => listMembers(organizationId),
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
      {members.isPending && <p>Yükleniyor…</p>}
      {members.isError && <p role="alert">{describeError(members.error)}</p>}
      {members.data && (
        <ul>
          {members.data.map((member) => (
            <li key={member.userId}>
              {member.email} <small>{member.role}</small>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
