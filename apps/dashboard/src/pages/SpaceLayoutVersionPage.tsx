import { useQuery } from "@tanstack/react-query";
import type { UserOrganization } from "@ticketing/contracts";
import { useTranslation } from "react-i18next";
import { Link, useOutletContext, useParams } from "react-router";
import { ApiError } from "../api/client.ts";
import { describeError } from "../api/errors.ts";
import { spaceLayoutVersionQuery } from "../api/space-layouts.ts";
import { PageHeader } from "../components/PageHeader.tsx";
import { LayoutVersionDrawing } from "../features/space-layouts/LayoutVersionDrawing.tsx";

export function SpaceLayoutVersionPage() {
  const { t } = useTranslation();
  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();
  const { venueId, spaceId, layoutId, versionId } = useParams();
  if (!venueId || !spaceId || !layoutId || !versionId)
    throw new Error("layout version route params missing");
  const detail = useQuery(
    spaceLayoutVersionQuery(
      organization.id,
      venueId,
      spaceId,
      layoutId,
      versionId,
    ),
  );
  const back = (
    <Link
      to={`/organizations/${organization.id}/venues/${venueId}?space=${spaceId}`}
    >
      {t("layouts.backToList")}
    </Link>
  );
  if (detail.isPending)
    return (
      <>
        {back}
        <p>{t("common.loading")}</p>
      </>
    );
  if (detail.isError)
    return (
      <>
        {back}
        <p role="alert">
          {detail.error instanceof ApiError && detail.error.status === 404
            ? t("layouts.notFound")
            : describeError(detail.error, t)}
        </p>
      </>
    );
  const { layout, version } = detail.data;
  return (
    <>
      {back}
      <PageHeader
        title={layout.name}
        description={`${t("layouts.version", { n: version.version })} · ${t(`layouts.status.${version.status}`)} · ${version.width} × ${version.height}`}
      />
      <LayoutVersionDrawing
        key={`${organization.id}:${version.id}:${version.width}:${version.height}`}
        version={version}
        canEdit={organization.role === "owner" || organization.role === "admin"}
        label={t("layouts.drawingLabel", {
          name: layout.name,
          n: version.version,
        })}
      />
    </>
  );
}
