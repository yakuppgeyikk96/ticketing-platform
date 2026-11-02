import type { UserOrganization } from "@ticketing/contracts";
import { useTranslation } from "react-i18next";
import { Link, useOutletContext } from "react-router";
import styles from "./OrganizationPage.module.css";

export function OrganizationPage() {
  const { t } = useTranslation();
  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();

  return (
    <>
      <header className={styles.header}>
        <Link to="/organizations">← {t("organizations.title")}</Link>
        <h1>{organization.name}</h1>
        <p className={styles.meta}>
          <code>{organization.slug}</code>
          <span>
            {t("organizations.yourRole", {
              role: t(`roles.${organization.role}`),
            })}
          </span>
        </p>
      </header>

      <nav
        aria-label={t("nav.organizationSections")}
        className={styles.section}
      >
        <Link to="events">{t("nav.events")}</Link>
        <Link to="venues">{t("nav.venues")}</Link>
        <Link to="members">{t("nav.members")}</Link>
      </nav>
    </>
  );
}
