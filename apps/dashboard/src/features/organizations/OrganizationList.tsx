import { useQuery } from "@tanstack/react-query";
import type { MemberRole, UserOrganization } from "@ticketing/contracts";
import { Link, useNavigate } from "react-router";
import { describeError } from "../../api/errors.ts";
import { myOrganizationsQuery } from "../../api/organizations.ts";
import { ActionMenu } from "../../components/ActionMenu.tsx";
import { Badge } from "../../components/Badge.tsx";
import { Dropdown } from "../../components/Dropdown.tsx";
import { Table, type TableColumn } from "../../components/Table.tsx";
import { matchesQuery } from "../../lib/search.ts";
import styles from "./OrganizationList.module.css";

interface OrganizationListProps {
  // Toolbar search text; filtered here, on the client, the list is small.
  query?: string;
}

const roleVariant: Record<MemberRole, "accent" | "neutral"> = {
  owner: "accent",
  admin: "neutral",
  staff: "neutral",
};

export function OrganizationList({ query = "" }: OrganizationListProps) {
  const organizations = useQuery(myOrganizationsQuery);
  const navigate = useNavigate();

  // Inside the component: the actions column needs `navigate`.
  const columns: TableColumn<UserOrganization>[] = [
    {
      key: "name",
      title: "Ad",
      render: (name: string, org) => (
        <Link to={`/organizations/${org.id}`} className={styles.name}>
          {name}
        </Link>
      ),
    },
    {
      key: "slug",
      title: "Slug",
      render: (slug: string) => <code className={styles.slug}>{slug}</code>,
    },
    {
      key: "role",
      title: "Rolün",
      // Contextual typing cannot pick the union member from `key` alone; annotate.
      render: (role: MemberRole) => (
        <Badge variant={roleVariant[role]}>{role}</Badge>
      ),
    },
    {
      id: "actions",
      title: "İşlemler",
      hideTitle: true,
      align: "end",
      render: (org: UserOrganization) => (
        <ActionMenu label={`${org.name} işlemleri`}>
          <Dropdown.Item
            onClick={() => void navigate(`/organizations/${org.id}`)}
          >
            Genel bakış
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => void navigate(`/organizations/${org.id}/events`)}
          >
            Etkinlikler
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => void navigate(`/organizations/${org.id}/members`)}
          >
            Üyeler
          </Dropdown.Item>
        </ActionMenu>
      ),
    },
  ];

  if (organizations.isPending) {
    return <p>Yükleniyor...</p>;
  }

  if (organizations.isError) {
    return <p role="alert">{describeError(organizations.error)}</p>;
  }

  const rows = organizations.data.filter((org) =>
    matchesQuery(query, org.name, org.slug),
  );
  const filtered = rows.length !== organizations.data.length;

  return (
    <Table
      columns={columns}
      data={rows}
      rowKey="id"
      emptyMessage={
        filtered ? "Aramayla eşleşen organizasyon yok." : "Henüz bir organizasyonun yok."
      }
      footer={
        filtered
          ? `${rows.length} / ${organizations.data.length} organizasyon`
          : `${rows.length} organizasyon`
      }
    />
  );
}
