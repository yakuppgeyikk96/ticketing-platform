import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemberRole } from "@ticketing/contracts";
import { describeError } from "../api/errors.ts";
import {
  listMembers,
  organizationKeys,
  removeMember,
} from "../api/organizations.ts";
import { Button } from "../components/Button.tsx";
import styles from "./MemberList.module.css";

interface MemberListProps {
  organizationId: string;
  // The caller's role, for showing or hiding controls. The server decides for real.
  role: MemberRole;
}

const removeMessages = {
  "/problems/cannot-remove-self":
    "Kendini çıkaramazsın; başka bir owner çıkarabilir",
  "/problems/last-owner": "Organizasyonun tek owner'ı çıkarılamaz",
  "/problems/member-not-found": "Bu kişi artık üye değil",
};

export function MemberList({ organizationId, role }: MemberListProps) {
  const queryClient = useQueryClient();

  const members = useQuery({
    queryKey: organizationKeys.members(organizationId),
    queryFn: () => listMembers(organizationId),
  });

  // One mutation for the whole list; `variables` tells which row is in flight.
  const removal = useMutation({
    mutationFn: (userId: string) => removeMember(organizationId, userId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: organizationKeys.members(organizationId),
      }),
  });

  if (members.isPending) return <p>Yükleniyor…</p>;
  if (members.isError) {
    return <p role="alert">{describeError(members.error)}</p>;
  }

  const canRemove = role === "owner";

  return (
    <ul role="list">
      {members.data.map((member) => {
        const removing =
          removal.isPending && removal.variables === member.userId;
        const failed = removal.isError && removal.variables === member.userId;
        return (
          // Pessimistic on purpose: the row waits for the server and says so.
          <li
            key={member.userId}
            className={[styles.row, removing && styles.removing]
              .filter(Boolean)
              .join(" ")}
          >
            <span className={styles.email}>{member.email}</span>
            <span className={styles.role}>{member.role}</span>
            {canRemove && (
              <Button
                variant="danger"
                busy={removing}
                disabled={removal.isPending}
                onClick={() => removal.mutate(member.userId)}
              >
                {removing ? "Çıkarılıyor…" : "Çıkar"}
              </Button>
            )}
            {failed && (
              <p role="alert" className={styles.error}>
                {describeError(removal.error, removeMessages)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
