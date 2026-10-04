import { ApiError } from "./api/client.ts";
import { LoginForm } from "./auth/LoginForm.tsx";
import { CreateOrganizationForm } from "./organizations/CreateOrganizationForm.tsx";
import { OrganizationList } from "./organizations/OrganizationList.tsx";
import { useSession } from "./auth/session.ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "./api/auth.ts";

export function App() {
  const session = useSession();

  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    // to clear organization lists of previous user
    // in case next user who logs in might be different
    onSuccess: () => queryClient.clear(),
  });

  if (session.isPending) {
    return <p>Yükleniyor…</p>;
  }

  if (session.isError) {
    const err = session.error;

    if (err instanceof ApiError && err.status === 401) {
      return <LoginForm />;
    }

    return (
      <>
        <p>Sunucuya ulaşılamadı</p>
        <button onClick={() => void session.refetch()}>Tekrar dene</button>
      </>
    );
  }

  return (
    <>
      <CreateOrganizationForm />
      <OrganizationList />
      <button
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
      >
        Çıkış yap
      </button>
    </>
  );
}
