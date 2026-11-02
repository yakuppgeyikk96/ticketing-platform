import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { SearchField } from "../components/SearchField.tsx";
import { Toolbar } from "../components/Toolbar.tsx";
import { IconPlus } from "../components/icons/IconPlus.tsx";
import { CreateOrganizationForm } from "../features/organizations/CreateOrganizationForm.tsx";
import { OrganizationList } from "../features/organizations/OrganizationList.tsx";

export function OrganizationsPage() {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <>
      <PageHeader
        title={t("organizations.title")}
        description={t("organizations.description")}
      />
      <Toolbar
        start={
          <SearchField
            label={t("organizations.search")}
            value={query}
            onChange={setQuery}
          />
        }
        end={
          <Button
            icon={<IconPlus size="16" />}
            onClick={() => setCreating(true)}
          >
            {t("organizations.new")}
          </Button>
        }
      />
      <OrganizationList query={query} />

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={t("organizations.new")}
        closeLabel={t("dialog.close")}
      >
        <CreateOrganizationForm
          onSuccess={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      </Dialog>
    </>
  );
}
