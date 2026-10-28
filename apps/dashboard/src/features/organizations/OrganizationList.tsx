import { useQuery } from "@tanstack/react-query";
import type { MemberRole, UserOrganization } from "@ticketing/contracts";
import { Link } from "react-router";
import { describeError } from "../../api/errors.ts";
import { myOrganizationsQuery } from "../../api/organizations.ts";
import { Badge } from "../../components/Badge.tsx";
import { Table, type TableColumn } from "../../components/Table.tsx";

const roleVariant: Record<MemberRole, "accent" | "neutral"> = {
  owner: "accent",
  admin: "neutral",
  staff: "neutral",
};

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
  {
    key: "role",
    title: "Rolün",
    // Contextual typing cannot pick the union member from `key` alone; annotate.
    render: (role: MemberRole) => (
      <Badge variant={roleVariant[role]}>{role}</Badge>
    ),
  },
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
