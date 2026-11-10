import { useQuery } from "@tanstack/react-query";
import type { SpaceLayoutListItem } from "@ticketing/contracts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { describeError } from "../../api/errors.ts";
import { spaceLayoutsQuery } from "../../api/space-layouts.ts";
import { Button } from "../../components/Button.tsx";
import { Dialog } from "../../components/Dialog.tsx";
import { Table, type TableColumn } from "../../components/Table.tsx";
import { Toolbar } from "../../components/Toolbar.tsx";
import { CreateSpaceLayoutForm } from "./CreateSpaceLayoutForm.tsx";

interface Props {
  organizationId: string;
  venueId: string;
  spaceId: string;
  spaceName: string;
  canEdit: boolean;
}

export function SpaceLayouts({
  organizationId,
  venueId,
  spaceId,
  spaceName,
  canEdit,
}: Props) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const layouts = useQuery(spaceLayoutsQuery(organizationId, venueId, spaceId));
  const columns: TableColumn<SpaceLayoutListItem>[] = [
    { key: "name", title: t("layouts.form.name") },
    {
      key: "draftVersion",
      title: t("layouts.draft"),
      render: (version: SpaceLayoutListItem["draftVersion"], layout) =>
        version ? (
          <Link
            to={`/organizations/${organizationId}/venues/${venueId}/spaces/${spaceId}/layouts/${layout.id}/versions/${version.id}`}
          >
            {t("layouts.version", { n: version.version })}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      key: "latestPublishedVersion",
      title: t("layouts.published"),
      render: (
        version: SpaceLayoutListItem["latestPublishedVersion"],
        layout,
      ) =>
        version ? (
          <Link
            to={`/organizations/${organizationId}/venues/${venueId}/spaces/${spaceId}/layouts/${layout.id}/versions/${version.id}`}
          >
            {t("layouts.version", { n: version.version })}
          </Link>
        ) : (
          "—"
        ),
    },
  ];
  return (
    <section aria-label={t("layouts.title", { name: spaceName })}>
      <Toolbar
        start={<h2>{t("layouts.title", { name: spaceName })}</h2>}
        end={
          canEdit && (
            <Button onClick={() => setCreating(true)}>
              {t("layouts.new")}
            </Button>
          )
        }
      />
      {layouts.isPending ? (
        <p>{t("common.loading")}</p>
      ) : layouts.isError ? (
        <p role="alert">{describeError(layouts.error, t)}</p>
      ) : (
        <Table
          columns={columns}
          data={layouts.data}
          rowKey="id"
          emptyMessage={t("layouts.empty")}
        />
      )}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={t("layouts.new")}
        closeLabel={t("dialog.close")}
      >
        {creating && canEdit && (
          <CreateSpaceLayoutForm
            organizationId={organizationId}
            venueId={venueId}
            spaceId={spaceId}
            onClose={() => setCreating(false)}
          />
        )}
      </Dialog>
    </section>
  );
}
