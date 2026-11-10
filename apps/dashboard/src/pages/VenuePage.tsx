import { useQuery } from "@tanstack/react-query";
import type { Space, UserOrganization } from "@ticketing/contracts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router";
import { ApiError } from "../api/client.ts";
import { describeError } from "../api/errors.ts";
import { spacesQuery } from "../api/spaces.ts";
import { getVenue, venueKeys } from "../api/venues.ts";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { Table, type TableColumn } from "../components/Table.tsx";
import { Toolbar } from "../components/Toolbar.tsx";
import { CreateSpaceForm } from "../features/spaces/CreateSpaceForm.tsx";
import { SpaceLayouts } from "../features/space-layouts/SpaceLayouts.tsx";
import { localeTag } from "../i18n/index.ts";

export function VenuePage() {
  const { t, i18n } = useTranslation();
  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();
  const { venueId } = useParams();
  if (!venueId) throw new Error("route param venueId missing");
  const [creating, setCreating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const venue = useQuery({
    queryKey: [...venueKeys.all(organization.id), "detail", venueId],
    queryFn: () => getVenue(organization.id, venueId),
  });
  const spaces = useQuery(spacesQuery(organization.id, venueId));
  const selectedSpace = spaces.data?.find(
    (space) => space.id === searchParams.get("space"),
  );
  const canEdit =
    organization.role === "owner" || organization.role === "admin";
  const people = new Intl.NumberFormat(localeTag(i18n.language));
  const columns: TableColumn<Space>[] = [
    { key: "name", title: t("spaces.form.name") },
    {
      key: "description",
      title: t("spaces.form.description"),
      render: (value: string | null) => value || "—",
    },
    {
      id: "layouts",
      title: t("layouts.column"),
      render: (space: Space) => (
        <Button
          variant="secondary"
          aria-pressed={selectedSpace?.id === space.id}
          onClick={() =>
            setSearchParams((previous) => {
              const next = new URLSearchParams(previous);
              next.set("space", space.id);
              return next;
            })
          }
        >
          {t("layouts.view")}
        </Button>
      ),
    },
    {
      key: "capacity",
      title: t("spaces.form.capacity"),
      align: "end",
      render: (value: number | null) =>
        value === null ? "—" : people.format(value),
    },
  ];
  const back = (
    <Link to={`/organizations/${organization.id}/venues`}>
      {t("venues.backToList")}
    </Link>
  );
  if (venue.isPending) return <p>{t("common.loading")}</p>;
  if (venue.isError)
    return (
      <>
        {back}
        <p role="alert">
          {venue.error instanceof ApiError && venue.error.status === 404
            ? t("venues.notFound")
            : describeError(venue.error, t)}
        </p>
      </>
    );

  return (
    <>
      {back}
      <PageHeader
        title={venue.data.name}
        description={[venue.data.city, venue.data.address, venue.data.timezone]
          .filter(Boolean)
          .join(" · ")}
      />
      <Toolbar
        start={<h2>{t("spaces.title")}</h2>}
        end={
          canEdit && (
            <Button onClick={() => setCreating(true)}>{t("spaces.new")}</Button>
          )
        }
      />
      {spaces.isPending ? (
        <p>{t("common.loading")}</p>
      ) : spaces.isError ? (
        <p role="alert">{describeError(spaces.error, t)}</p>
      ) : (
        <Table
          columns={columns}
          data={spaces.data}
          rowKey="id"
          emptyMessage={t("spaces.empty")}
        />
      )}
      {selectedSpace && (
        <SpaceLayouts
          key={selectedSpace.id}
          organizationId={organization.id}
          venueId={venueId}
          spaceId={selectedSpace.id}
          spaceName={selectedSpace.name}
          canEdit={canEdit}
        />
      )}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={t("spaces.new")}
        closeLabel={t("dialog.close")}
      >
        {creating && (
          <CreateSpaceForm
            organizationId={organization.id}
            venueId={venueId}
            onSuccess={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        )}
      </Dialog>
    </>
  );
}
