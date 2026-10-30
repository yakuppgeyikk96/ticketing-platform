import type { UserOrganization } from "@ticketing/contracts";
import { useState } from "react";
import { useOutletContext } from "react-router";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { SearchField } from "../components/SearchField.tsx";
import { Toolbar } from "../components/Toolbar.tsx";
import { IconPlus } from "../components/icons/IconPlus.tsx";
import { CreateVenueForm } from "../features/venues/CreateVenueForm.tsx";
import { VenueList } from "../features/venues/VenueList.tsx";

export function VenuesPage() {
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();

  const canEdit =
    organization.role === "owner" || organization.role === "admin";

  return (
    <>
      <PageHeader
        title="Mekânlar"
        description="Gösterimlerin yapıldığı yerler. Saat dilimi, gösterim saatlerinin hangi saate göre girileceğini belirler."
      />
      <Toolbar
        start={
          <SearchField label="Mekân ara…" value={query} onChange={setQuery} />
        }
        end={
          canEdit && (
            <Button
              icon={<IconPlus size="16" />}
              onClick={() => setCreating(true)}
            >
              Yeni mekân
            </Button>
          )
        }
      />
      <VenueList organizationId={organization.id} query={query} />

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Yeni mekân"
      >
        <CreateVenueForm
          organizationId={organization.id}
          onSuccess={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      </Dialog>
    </>
  );
}
