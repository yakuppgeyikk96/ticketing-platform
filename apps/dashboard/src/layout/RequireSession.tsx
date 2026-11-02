import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router";
import { ApiError } from "../api/client.ts";
import { Button } from "../components/Button.tsx";
import { useSession } from "../features/auth/useSession.ts";
import { applyLocale } from "../i18n/index.ts";

// Layout route: every page nested under it renders in <Outlet /> and may
// assume a session exists. Protecting a page means placing it under this node.
export function RequireSession() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const location = useLocation();

  // The account's language wins over whatever the browser remembered: the
  // same person on a new device, or a different person on this one.
  const userLocale = session.data?.locale;
  useEffect(() => {
    if (userLocale && userLocale !== i18n.language)
      void applyLocale(userLocale);
  }, [userLocale, i18n.language]);

  if (session.isPending) {
    return <p>{t("common.loading")}</p>;
  }

  if (session.isError) {
    if (session.error instanceof ApiError && session.error.status === 401) {
      // Remember where the user was heading so LoginPage can send them back.
      return (
        <Navigate to="/login" replace state={{ from: location.pathname }} />
      );
    }

    return (
      <>
        <p>{t("common.serverUnreachable")}</p>
        <Button variant="secondary" onClick={() => void session.refetch()}>
          {t("common.retry")}
        </Button>
      </>
    );
  }

  return <Outlet />;
}
