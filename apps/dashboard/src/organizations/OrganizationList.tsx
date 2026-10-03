import { listMyOrganizations } from "../api/organizations.ts";
import { describeError } from "../api/errors.ts";
import { useQuery } from "@tanstack/react-query";

export function OrganizationList() {
  const query = useQuery({
    queryKey: ["organizations", "mine"],
    queryFn: listMyOrganizations,
  });

  if (query.isPending) {
    return <p>Yükleniyor...</p>;
  }

  if (query.isError) {
    return <p role="alert">{describeError(query.error)}</p>;
  }

  if (query.data.length === 0) {
    return <p>Henüz bir organizasyonun yok.</p>;
  }

  return (
    <ul>
      {query.data.map((org) => (
        <li key={org.id}>
          {org.name}
          <small>{org.role}</small>
        </li>
      ))}
    </ul>
  );
}
