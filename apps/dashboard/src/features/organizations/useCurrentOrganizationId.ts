import { useEffect } from "react";
import { useMatch } from "react-router";
import { useStoredValue } from "../../hooks/useStoredValue.ts";

const STORAGE_KEY = "last-organization";

export function useCurrentOrganizationId(): string | null {
  const match = useMatch("/organizations/:organizationId/*");
  const organizationId = match?.params.organizationId ?? null;
  const [stored, setStored] = useStoredValue(STORAGE_KEY, "");

  useEffect(() => {
    if (organizationId) setStored(organizationId);
  }, [organizationId, setStored]);

  return organizationId ?? (stored || null);
}

export function useForgetCurrentOrganization() {
  const [, setStored] = useStoredValue(STORAGE_KEY, "");
  return () => setStored("");
}
