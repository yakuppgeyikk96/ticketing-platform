import type { UserOrganization } from "@ticketing/contracts";
import { useState } from "react";
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

const statusOptions = [
  { value: "all", label: "Tümü" },
  { value: "published", label: "Yayında" },
  { value: "draft", label: "Taslak" },
  { value: "archived", label: "Arşiv" },
] as const satisfies readonly { value: EventStatusFilter; label: string }[];

export function EventsPage() {
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<EventStatusFilter>("all");

  const { organization } = useOutletContext<{
    organization: UserOrganization;
  }>();

  const canEdit =
    organization.role === "owner" || organization.role === "admin";

  return (
    <>
      <PageHeader
        title="Etkinlikler"
        description="Bu organizasyonun etkinlikleri. Yayınlananlar satışa açılabilir, taslaklar sadece burada görünür."
      />
      <Toolbar
        start={
          <>
            <SearchField
              label="Etkinlik ara…"
              value={query}
              onChange={setQuery}
            />
            <SegmentedControl
              label="Durum filtresi"
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
              Yeni etkinlik
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
        title="Yeni etkinlik"
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
