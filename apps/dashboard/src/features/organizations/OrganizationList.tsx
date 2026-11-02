import { useQuery } from "@tanstack/react-query";
import type { MemberRole, UserOrganization } from "@ticketing/contracts";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const organizations = useQuery(myOrganizationsQuery);
  const navigate = useNavigate();

  // Inside the component: the actions column needs `navigate` and `t`.
  const columns: TableColumn<UserOrganization>[] = [
    {
      key: "name",
      title: t("organizations.column.name"),
      render: (name: string, org) => (
        <Link to={`/organizations/${org.id}`} className={styles.name}>
          {name}
        </Link>
      ),
    },
    {
      key: "slug",
      title: t("organizations.column.slug"),
      render: (slug: string) => <code className={styles.slug}>{slug}</code>,
    },
    {
      key: "role",
      title: t("organizations.column.role"),
      // Contextual typing cannot pick the union member from `key` alone; annotate.
      render: (role: MemberRole) => (
        <Badge variant={roleVariant[role]}>{t(`roles.${role}`)}</Badge>
      ),
    },
    {
      id: "actions",
      title: t("common.actions"),
      hideTitle: true,
      align: "end",
      render: (org: UserOrganization) => (
        <ActionMenu label={t("common.rowActions", { name: org.name })}>
          <Dropdown.Item
            onClick={() => void navigate(`/organizations/${org.id}`)}
          >
            {t("nav.overview")}
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => void navigate(`/organizations/${org.id}/events`)}
          >
            {t("nav.events")}
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => void navigate(`/organizations/${org.id}/members`)}
          >
            {t("nav.members")}
          </Dropdown.Item>
        </ActionMenu>
      ),
    },
  ];

  if (organizations.isPending) {
    return <p>{t("common.loading")}</p>;
  }

  if (organizations.isError) {
    return <p role="alert">{describeError(organizations.error, t)}</p>;
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
        filtered ? t("organizations.emptyFiltered") : t("organizations.empty")
      }
      footer={
        filtered
          ? t("organizations.countFiltered", {
              shown: rows.length,
              total: organizations.data.length,
            })
          : t("organizations.count", { count: rows.length })
      }
    />
  );
}
