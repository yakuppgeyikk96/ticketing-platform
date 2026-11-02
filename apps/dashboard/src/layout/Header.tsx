import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { logout } from "../api/auth.ts";
import { Button } from "../components/Button.tsx";
import { Dropdown } from "../components/Dropdown.tsx";
import { Avatar } from "../components/Avatar.tsx";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import { IconMenu } from "../components/icons/IconMenu.tsx";
import { useSession } from "../features/auth/useSession.ts";
import { OrganizationsDropdown } from "../features/organizations/OrganizationsDropdown.tsx";
import { useLocale } from "../i18n/useLocale.ts";

interface HeaderProps {
  onToggleSidebar: () => void;
}

// Language codes read the same in both languages, so they are not translated.
const localeOptions = [
  { value: "tr", label: "TR" },
  { value: "en", label: "EN" },
] as const;

export function Header({ onToggleSidebar }: HeaderProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const session = useSession();
  const { locale, setLocale } = useLocale();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Drop everything, not just the session: the next login may be someone else.
      // clear() does not notify mounted observers, so RequireSession would keep
      // its stale session; navigate explicitly instead of waiting for a re-render.
      queryClient.clear();
      void navigate("/login", { replace: true });
    },
  });

  return (
    <header className="app-header">
      <div className="app-header-group">
        <Button
          type="button"
          variant="icon"
          aria-label={t("header.toggleMenu")}
          onClick={onToggleSidebar}
        >
          <IconMenu size="20" />
        </Button>
        <span className="app-brand">Ticketing</span>
        <span className="app-header-divider" aria-hidden="true" />
        <OrganizationsDropdown />
      </div>
      <div className="app-header-group">
        <SegmentedControl
          label={t("header.language")}
          options={localeOptions}
          value={locale}
          onChange={(next) => void setLocale(next)}
        />
        <Dropdown
          label={t("header.accountMenu")}
          trigger={<Avatar name={session.data?.email} />}
        >
          <Dropdown.Item
            danger
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {t("header.logout")}
          </Dropdown.Item>
        </Dropdown>
      </div>
    </header>
  );
}
