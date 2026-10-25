import { NavLink } from "react-router";
import styles from "./Sidebar.module.css";
import { useCurrentOrganizationId } from "../features/organizations/useCurrentOrganizationId.ts";

interface SidebarItem {
  id: string;
  title: string;
  route: string;
  end?: boolean;
}

const appItems: SidebarItem[] = [
  {
    id: "app-organizations",
    title: "Organizasyonlar",
    route: "/organizations",
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
      end: true,
    },
    {
      id: "org-events",
      title: "Etkinlikler",
      route: `/organizations/${organizationId}/events`,
    },
    {
      id: "org-venues",
      title: "Mekânlar",
      route: `/organizations/${organizationId}/venues`,
    },
    {
      id: "org-members",
      title: "Üyeler",
      route: `/organizations/${organizationId}/members`,
    },
  ];
}

export function Sidebar() {
  const organizationId = useCurrentOrganizationId();

  return (
    <aside className="app-sidebar">
      <nav aria-label="Ana menü">
        <ul className={styles.list} role="list">
          {appItems.map(renderItem)}
        </ul>
        {organizationId && (
          <ul className={styles.list} role="list" aria-label="Organizasyon">
            {organizationItems(organizationId).map(renderItem)}
          </ul>
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
        {item.title}
      </NavLink>
    </li>
  );
}
