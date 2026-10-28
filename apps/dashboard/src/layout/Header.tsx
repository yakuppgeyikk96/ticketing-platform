import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { logout } from "../api/auth.ts";
import { Button } from "../components/Button.tsx";
import { Dropdown } from "../components/Dropdown.tsx";
import { Avatar } from "../components/Avatar.tsx";
import { IconMenu } from "../components/icons/IconMenu.tsx";
import { useSession } from "../features/auth/useSession.ts";
import { OrganizationsDropdown } from "../features/organizations/OrganizationsDropdown.tsx";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const session = useSession();

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
          aria-label="Menüyü aç/kapat"
          onClick={onToggleSidebar}
        >
          <IconMenu size="20" />
        </Button>
        <span className="app-brand">Ticketing</span>
        <span className="app-header-divider" aria-hidden="true" />
        <OrganizationsDropdown />
      </div>
      <Dropdown
        label="Hesap menüsü"
        trigger={<Avatar name={session.data?.email} />}
      >
        <Dropdown.Item
          danger
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          Çıkış yap
        </Dropdown.Item>
      </Dropdown>
    </header>
  );
}
