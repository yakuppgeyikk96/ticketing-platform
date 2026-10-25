import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/auth.ts";
import { Button } from "../components/Button.tsx";

export function Header() {
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    // Drop everything, not just the session: the next login may be someone else.
    onSuccess: () => queryClient.clear(),
  });

  return (
    <header className="app-header">
      <Button
        variant="secondary"
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
      >
        Çıkış yap
      </Button>
    </header>
  );
}
