import { useCallback, useEffect } from "react";
import { useMatch, useNavigate } from "react-router";
import { useStoredValue } from "../../hooks/useStoredValue.ts";

const STORAGE_KEY = "last-organization";

export function useCurrentOrganizationId() {
  const match = useMatch("/organizations/:organizationId/*");
  const fromUrl = match?.params.organizationId ?? null;
  const subPath = match?.params["*"] ?? "";
  const [stored, setStored] = useStoredValue(STORAGE_KEY, "");
  const navigate = useNavigate();

  useEffect(() => {
    if (fromUrl) setStored(fromUrl);
  }, [fromUrl, setStored]);

  const select = useCallback(
    (organizationId: string) => {
      setStored(organizationId);
      if (fromUrl && fromUrl !== organizationId) {
        void navigate(`/organizations/${organizationId}/${subPath}`);
      }
    },
    [fromUrl, subPath, setStored, navigate],
  );

  return [fromUrl ?? (stored || null), select] as const;
}

export function useForgetCurrentOrganization() {
  const [, setStored] = useStoredValue(STORAGE_KEY, "");
  return () => setStored("");
}
