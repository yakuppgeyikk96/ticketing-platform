import { myOrganizationsQuery } from "../../api/organizations.ts";
import { describeError } from "../../api/errors.ts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import { Table, type TableColumn } from "../../components/Table.tsx";
import type { UserOrganization } from "@ticketing/contracts";

const columns: TableColumn<UserOrganization>[] = [
  {
    key: "name",
    title: "Ad",
    render: (name, org) => <Link to={`/organizations/${org.id}`}>{name}</Link>,
  },
  {
    key: "slug",
    title: "Slug",
    render: (slug: string) => <code>{slug}</code>,
  },
  { key: "role", title: "Rolün" },
];

export function OrganizationList() {
  const query = useQuery(myOrganizationsQuery);

  if (query.isPending) {
    return <p>Yükleniyor...</p>;
  }

  if (query.isError) {
    return <p role="alert">{describeError(query.error)}</p>;
  }

  return <Table columns={columns} data={query.data} rowKey="id" />;
}
