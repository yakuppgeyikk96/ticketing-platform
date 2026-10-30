import type { UserOrganization } from "@ticketing/contracts";
import { useState } from "react";
import { useOutletContext } from "react-router";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { SearchField } from "../components/SearchField.tsx";
import { Toolbar } from "../components/Toolbar.tsx";
import { IconPlus } from "../components/icons/IconPlus.tsx";
import { AddMemberForm } from "../features/members/AddMemberForm.tsx";
import { MemberList } from "../features/members/MemberList.tsx";

export function MembersPage() {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();

  const canEdit =
    organization.role === "owner" || organization.role === "admin";

  return (
    <>
      <PageHeader
        title="Üyeler"
        description="Bu organizasyona erişimi olan hesaplar. Sahipler üye çıkarabilir, yöneticiler ekleyebilir."
      />
      <Toolbar
        start={
          <SearchField label="Üye ara…" value={query} onChange={setQuery} />
        }
        end={
          canEdit && (
            <Button
              icon={<IconPlus size="16" />}
              onClick={() => setAdding(true)}
            >
              Üye ekle
            </Button>
          )
        }
      />
      <MemberList
        organizationId={organization.id}
        role={organization.role}
        query={query}
      />

      <Dialog open={adding} onClose={() => setAdding(false)} title="Üye ekle">
        <AddMemberForm
          organizationId={organization.id}
          onSuccess={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      </Dialog>
    </>
  );
}
