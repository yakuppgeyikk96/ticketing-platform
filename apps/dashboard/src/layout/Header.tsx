import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { logout } from "../api/auth.ts";
import { Button } from "../components/Button.tsx";
import { Dropdown } from "../components/Dropdown.tsx";
import { Avatar } from "../components/Avatar.tsx";
import { IconMenu } from "../components/icons/IconMenu.tsx";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      <Button type="button" variant="icon" onClick={onToggleSidebar}>
        <IconMenu />
      </Button>
      <Dropdown label="Profile" trigger={<Avatar />}>
        <Button
          variant="secondary"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          Çıkış yap
        </Button>
      </Dropdown>
    </header>
  );
}
