import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { myOrganizationsQuery } from "../api/organizations.ts";
import { IconBuilding } from "../components/icons/IconBuilding.tsx";
import { IconCalendar } from "../components/icons/IconCalendar.tsx";
import { IconLayoutDashboard } from "../components/icons/IconLayoutDashboard.tsx";
import { IconMapPin } from "../components/icons/IconMapPin.tsx";
import { IconUsers } from "../components/icons/IconUsers.tsx";
import { useCurrentOrganizationId } from "../features/organizations/useCurrentOrganizationId.ts";
import styles from "./Sidebar.module.css";

interface SidebarItem {
  id: string;
  // Dictionary key; resolved where it renders so the list stays static.
  titleKey: string;
  route: string;
  icon: ReactNode;
  end?: boolean;
}

const appItems: SidebarItem[] = [
  {
    id: "app-organizations",
    titleKey: "nav.organizations",
    route: "/organizations",
    icon: <IconBuilding size="16" />,
    end: true,
  },
];

// Scoped to the organization in the URL, so routes are built, not hard-coded.
function organizationItems(organizationId: string): SidebarItem[] {
  return [
    {
      id: "org-overview",
      titleKey: "nav.overview",
      route: `/organizations/${organizationId}`,
      icon: <IconLayoutDashboard size="16" />,
      end: true,
    },
    {
      id: "org-events",
      titleKey: "nav.events",
      route: `/organizations/${organizationId}/events`,
      icon: <IconCalendar size="16" />,
    },
    {
      id: "org-venues",
      titleKey: "nav.venues",
      route: `/organizations/${organizationId}/venues`,
      icon: <IconMapPin size="16" />,
    },
    {
      id: "org-members",
      titleKey: "nav.members",
      route: `/organizations/${organizationId}/members`,
      icon: <IconUsers size="16" />,
    },
  ];
}

export function Sidebar() {
  const { t } = useTranslation();
  const [organizationId] = useCurrentOrganizationId();
  // Already fetched by the header switcher; this reads the cache for the group label.
  const organizations = useQuery(myOrganizationsQuery);
  const organizationName = organizations.data?.find(
    (org) => org.id === organizationId,
  )?.name;

  const renderItem = (item: SidebarItem) => (
    <li key={item.id}>
      {/* CSS module keys are `string | undefined` under noUncheckedIndexedAccess. */}
      <NavLink
        to={item.route}
        end={item.end ?? false}
        className={styles.link ?? ""}
      >
        <span className={styles.icon}>{item.icon}</span>
        {t(item.titleKey)}
      </NavLink>
    </li>
  );

  return (
    <aside className="app-sidebar">
      <nav aria-label={t("nav.mainMenu")} className={styles.nav}>
        <ul className={styles.list} role="list">
          {appItems.map(renderItem)}
        </ul>
        {organizationId && (
          <div className={styles.group}>
            <span className={styles.groupLabel}>
              {organizationName ?? t("nav.organization")}
            </span>
            <ul
              className={styles.list}
              role="list"
              aria-label={t("nav.organization")}
            >
              {organizationItems(organizationId).map(renderItem)}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}
