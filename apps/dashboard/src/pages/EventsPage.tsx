import type { UserOrganization } from "@ticketing/contracts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { SearchField } from "../components/SearchField.tsx";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import { Toolbar } from "../components/Toolbar.tsx";
import { IconPlus } from "../components/icons/IconPlus.tsx";
import { CreateEventForm } from "../features/events/CreateEventForm.tsx";
import {
  EventList,
  type EventStatusFilter,
} from "../features/events/EventList.tsx";
import { eventStatusLabels } from "../features/events/eventStatus.ts";

// Filter order on screen; labels come from the shared status dictionary.
const statusFilters = ["published", "draft", "archived"] as const;

export function EventsPage() {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<EventStatusFilter>("all");

  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();

  const canEdit =
    organization.role === "owner" || organization.role === "admin";

  const statusOptions: { value: EventStatusFilter; label: string }[] = [
    { value: "all", label: t("events.all") },
    ...statusFilters.map((value) => ({
      value,
      label: t(eventStatusLabels[value].labelKey),
    })),
  ];

  return (
    <>
      <PageHeader
        title={t("events.title")}
        description={t("events.description")}
      />
      <Toolbar
        start={
          <>
            <SearchField
              label={t("events.search")}
              value={query}
              onChange={setQuery}
            />
            <SegmentedControl
              label={t("events.statusFilter")}
              options={statusOptions}
              value={status}
              onChange={setStatus}
            />
          </>
        }
        end={
          canEdit && (
            <Button
              icon={<IconPlus size="16" />}
              onClick={() => setCreating(true)}
            >
              {t("events.new")}
            </Button>
          )
        }
      />
      <EventList
        organizationId={organization.id}
        role={organization.role}
        query={query}
        status={status}
      />

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={t("events.new")}
        closeLabel={t("dialog.close")}
      >
        <CreateEventForm
          organizationId={organization.id}
          onSuccess={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      </Dialog>
    </>
  );
}
