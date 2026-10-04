import { useQuery } from "@tanstack/react-query";
import { me } from "../api/auth.ts";

export const sessionKey = ["auth", "me"] as const;

export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: me,
    retry: false,
    staleTime: Infinity,
  });
}
