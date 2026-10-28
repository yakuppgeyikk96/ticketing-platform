import { useState } from "react";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { SearchField } from "../components/SearchField.tsx";
import { Toolbar } from "../components/Toolbar.tsx";
import { IconPlus } from "../components/icons/IconPlus.tsx";
import { CreateOrganizationForm } from "../features/organizations/CreateOrganizationForm.tsx";
import { OrganizationList } from "../features/organizations/OrganizationList.tsx";

export function OrganizationsPage() {
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <>
      <PageHeader title="Organizasyonlarım" />
      <Toolbar
        start={
          <SearchField
            label="Organizasyon ara…"
            value={query}
            onChange={setQuery}
          />
        }
        end={
          <Button
            icon={<IconPlus size="16" />}
            onClick={() => setCreating(true)}
          >
            Yeni organizasyon
          </Button>
        }
      />
      <OrganizationList query={query} />

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Yeni organizasyon"
      >
        <CreateOrganizationForm onSuccess={() => setCreating(false)} />
      </Dialog>
    </>
  );
}
