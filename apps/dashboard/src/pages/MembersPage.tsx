import type { UserOrganization } from "@ticketing/contracts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        title={t("members.title")}
        description={t("members.description")}
      />
      <Toolbar
        start={
          <SearchField
            label={t("members.search")}
            value={query}
            onChange={setQuery}
          />
        }
        end={
          canEdit && (
            <Button
              icon={<IconPlus size="16" />}
              onClick={() => setAdding(true)}
            >
              {t("members.add")}
            </Button>
          )
        }
      />
      <MemberList
        organizationId={organization.id}
        role={organization.role}
        query={query}
      />

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title={t("members.add")}
        closeLabel={t("dialog.close")}
      >
        <AddMemberForm
          organizationId={organization.id}
          onSuccess={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      </Dialog>
    </>
  );
}
