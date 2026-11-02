import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../../components/Dropdown.tsx";
import { IconChevronDown } from "../../components/icons/IconChevronDown.tsx";
import { myOrganizationsQuery } from "../../api/organizations.ts";
import styles from "./OrganizationsDropdown.module.css";
import { useCurrentOrganizationId } from "./useCurrentOrganizationId.ts";

export function OrganizationsDropdown() {
  const { t } = useTranslation();
  const organizations = useQuery(myOrganizationsQuery);
  const [organizationId, selectOrganization] = useCurrentOrganizationId();

  if (organizations.isPending) return <p>{t("organizations.loadingList")}</p>;

  if (organizations.isError) return <p>{t("organizations.listFailed")}</p>;

  const selectedOrganization = organizations.data.find(
    (org) => org.id === organizationId,
  );

  return (
    <Dropdown
      triggerClassName={styles.trigger ?? ""}
      align="start"
      label={t("organizations.select")}
      trigger={
        <>
          <span className={styles.name}>
            {selectedOrganization?.name ?? t("organizations.select")}
          </span>
          <span className={styles.chevron}>
            <IconChevronDown size="16" />
          </span>
        </>
      }
    >
      {organizations.data.map((org) => (
        <Dropdown.Item key={org.id} onClick={() => selectOrganization(org.id)}>
          {org.name}
        </Dropdown.Item>
      ))}
    </Dropdown>
  );
}
