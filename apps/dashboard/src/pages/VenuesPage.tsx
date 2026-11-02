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
import { CreateVenueForm } from "../features/venues/CreateVenueForm.tsx";
import { VenueList } from "../features/venues/VenueList.tsx";

export function VenuesPage() {
  const { t } = useTranslation();
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
        title={t("venues.title")}
        description={t("venues.description")}
      />
      <Toolbar
        start={
          <SearchField
            label={t("venues.search")}
            value={query}
            onChange={setQuery}
          />
        }
        end={
          canEdit && (
            <Button
              icon={<IconPlus size="16" />}
              onClick={() => setCreating(true)}
            >
              {t("venues.new")}
            </Button>
          )
        }
      />
      <VenueList organizationId={organization.id} query={query} />

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={t("venues.new")}
        closeLabel={t("dialog.close")}
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
