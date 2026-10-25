import type { UserOrganization } from "@ticketing/contracts";
import { useOutletContext } from "react-router";
import { AddMemberForm } from "../features/members/AddMemberForm.tsx";
import { MemberList } from "../features/members/MemberList.tsx";

export function MembersPage() {
  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();

  const canEdit =
    organization.role === "owner" || organization.role === "admin";

  return (
    <>
      <h2>Üyeler</h2>
      <MemberList organizationId={organization.id} role={organization.role} />
      {canEdit && <AddMemberForm organizationId={organization.id} />}
    </>
  );
}
