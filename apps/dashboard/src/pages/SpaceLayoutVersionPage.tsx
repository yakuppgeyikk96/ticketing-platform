import { useQuery } from "@tanstack/react-query";
import type { UserOrganization } from "@ticketing/contracts";
import { useTranslation } from "react-i18next";
import { Link, useOutletContext, useParams } from "react-router";
import { ApiError } from "../api/client.ts";
import { describeError } from "../api/errors.ts";
import { spaceLayoutVersionQuery } from "../api/space-layouts.ts";
import { PageHeader } from "../components/PageHeader.tsx";
import styles from "./SpaceLayoutVersionPage.module.css";

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
      <p>{t("layouts.drawingPlaceholder")}</p>
      <div className={styles.workspace}>
        <svg
          className={styles.plan}
          viewBox={`0 0 ${version.width} ${version.height}`}
          role="img"
          aria-label={t("layouts.drawingLabel", {
            name: layout.name,
            n: version.version,
          })}
        >
          <rect
            width={version.width}
            height={version.height}
            className={styles.background}
          />
        </svg>
      </div>
    </>
  );
}
