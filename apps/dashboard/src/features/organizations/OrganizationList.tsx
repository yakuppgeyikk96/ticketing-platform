import { useQuery } from "@tanstack/react-query";
import type { MemberRole, UserOrganization } from "@ticketing/contracts";
import { Link, useNavigate } from "react-router";
import { describeError } from "../../api/errors.ts";
import { myOrganizationsQuery } from "../../api/organizations.ts";
import { ActionMenu } from "../../components/ActionMenu.tsx";
import { Badge } from "../../components/Badge.tsx";
import { Dropdown } from "../../components/Dropdown.tsx";
import { Table, type TableColumn } from "../../components/Table.tsx";
import styles from "./OrganizationList.module.css";

const roleVariant: Record<MemberRole, "accent" | "neutral"> = {
  owner: "accent",
  admin: "neutral",
  staff: "neutral",
};

export function OrganizationList() {
  const query = useQuery(myOrganizationsQuery);
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

  if (query.isPending) {
    return <p>Yükleniyor...</p>;
  }

  if (query.isError) {
    return <p role="alert">{describeError(query.error)}</p>;
  }

  return (
    <Table
      columns={columns}
      data={query.data}
      rowKey="id"
      emptyMessage="Henüz bir organizasyonun yok."
      footer={`${query.data.length} organizasyon`}
    />
  );
}
