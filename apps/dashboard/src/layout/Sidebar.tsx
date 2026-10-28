import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
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
  title: string;
  route: string;
  icon: ReactNode;
  end?: boolean;
}

const appItems: SidebarItem[] = [
  {
    id: "app-organizations",
    title: "Organizasyonlar",
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
      title: "Genel bakış",
      route: `/organizations/${organizationId}`,
      icon: <IconLayoutDashboard size="16" />,
      end: true,
    },
    {
      id: "org-events",
      title: "Etkinlikler",
      route: `/organizations/${organizationId}/events`,
      icon: <IconCalendar size="16" />,
    },
    {
      id: "org-venues",
      title: "Mekânlar",
      route: `/organizations/${organizationId}/venues`,
      icon: <IconMapPin size="16" />,
    },
    {
      id: "org-members",
      title: "Üyeler",
      route: `/organizations/${organizationId}/members`,
      icon: <IconUsers size="16" />,
    },
  ];
}

export function Sidebar() {
  const [organizationId] = useCurrentOrganizationId();
  // Already fetched by the header switcher; this reads the cache for the group label.
  const organizations = useQuery(myOrganizationsQuery);
  const organizationName = organizations.data?.find(
    (org) => org.id === organizationId,
  )?.name;

  return (
    <aside className="app-sidebar">
      <nav aria-label="Ana menü" className={styles.nav}>
        <ul className={styles.list} role="list">
          {appItems.map(renderItem)}
        </ul>
        {organizationId && (
          <div className={styles.group}>
            <span className={styles.groupLabel}>
              {organizationName ?? "Organizasyon"}
            </span>
            <ul className={styles.list} role="list" aria-label="Organizasyon">
              {organizationItems(organizationId).map(renderItem)}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}

function renderItem(item: SidebarItem) {
  return (
    <li key={item.id}>
      {/* CSS module keys are `string | undefined` under noUncheckedIndexedAccess. */}
      <NavLink
        to={item.route}
        end={item.end ?? false}
        className={styles.link ?? ""}
      >
        <span className={styles.icon}>{item.icon}</span>
        {item.title}
      </NavLink>
    </li>
  );
}
