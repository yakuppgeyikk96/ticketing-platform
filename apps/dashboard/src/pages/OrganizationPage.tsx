import type { UserOrganization } from "@ticketing/contracts";
import { Link, useOutletContext } from "react-router";
import styles from "./OrganizationPage.module.css";

export function OrganizationPage() {
  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();

  return (
    <>
      <header className={styles.header}>
        <Link to="/organizations">← Organizasyonlarım</Link>
        <h1>{organization.name}</h1>
        <p className={styles.meta}>
          <code>{organization.slug}</code>
          <span>rolün: {organization.role}</span>
        </p>
      </header>

      <nav aria-label="Organizasyon bölümleri" className={styles.section}>
        <Link to="events">Etkinlikler</Link>
        <Link to="venues">Mekânlar</Link>
        <Link to="members">Üyeler</Link>
      </nav>
    </>
  );
}
