import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Member, MemberRole } from "@ticketing/contracts";
import { useTranslation } from "react-i18next";
import { describeError } from "../../api/errors.ts";
import {
  listMembers,
  organizationKeys,
  removeMember,
} from "../../api/organizations.ts";
import { ActionMenu } from "../../components/ActionMenu.tsx";
import { Badge } from "../../components/Badge.tsx";
import { Dropdown } from "../../components/Dropdown.tsx";
import { Table, type TableColumn } from "../../components/Table.tsx";
import { matchesQuery } from "../../lib/search.ts";
import styles from "./MemberList.module.css";

interface MemberListProps {
  organizationId: string;
  // The caller's role, for showing or hiding controls. The server decides for real.
  role: MemberRole;
  query?: string;
}

const roleVariant: Record<MemberRole, "accent" | "neutral"> = {
  owner: "accent",
  admin: "neutral",
  staff: "neutral",
};

export function MemberList({
  organizationId,
  role,
  query = "",
}: MemberListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const members = useQuery({
    queryKey: organizationKeys.members(organizationId),
    queryFn: () => listMembers(organizationId),
  });

  // One mutation for the whole list; `variables` tells which row is in flight.
  const removal = useMutation({
    mutationFn: (userId: string) => removeMember(organizationId, userId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: organizationKeys.members(organizationId),
      }),
  });

  const canRemove = role === "owner";

  const columns: TableColumn<Member>[] = [
    {
      key: "email",
      title: t("members.column.email"),
      render: (email: string, member) => {
        const failed = removal.isError && removal.variables === member.userId;
        return (
          <div className={styles.cell}>
            <span className={styles.email}>{email}</span>
            {failed && (
              <p role="alert" className={styles.error}>
                {describeError(removal.error, t)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "role",
      title: t("members.column.role"),
      render: (role: MemberRole) => (
        <Badge variant={roleVariant[role]}>{t(`roles.${role}`)}</Badge>
      ),
    },
  ];

  if (canRemove) {
    columns.push({
      id: "actions",
      title: t("common.actions"),
      hideTitle: true,
      align: "end",
      render: (member: Member) => (
        <ActionMenu label={t("common.rowActions", { name: member.email })}>
          <Dropdown.Item
            danger
            disabled={removal.isPending}
            onClick={() => removal.mutate(member.userId)}
          >
            {t("members.remove")}
          </Dropdown.Item>
        </ActionMenu>
      ),
    });
  }

  if (members.isPending) return <p>{t("common.loading")}</p>;
  if (members.isError) {
    return <p role="alert">{describeError(members.error, t)}</p>;
  }

  const rows = members.data.filter((member) =>
    matchesQuery(query, member.email, member.role),
  );
  const filtered = rows.length !== members.data.length;

  return (
    <Table
      columns={columns}
      data={rows}
      rowKey="userId"
      // Pessimistic on purpose: the row waits for the server and says so.
      rowClassName={(member) =>
        removal.isPending &&
        removal.variables === member.userId &&
        styles.removing
      }
      emptyMessage={filtered ? t("members.emptyFiltered") : t("members.empty")}
      footer={
        filtered
          ? t("members.countFiltered", {
              shown: rows.length,
              total: members.data.length,
            })
          : t("members.count", { count: rows.length })
      }
    />
  );
}
