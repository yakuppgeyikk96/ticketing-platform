import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateOccurrenceInput } from "@ticketing/contracts";
import type { SubmitEvent } from "react";
import {
  describeError,
  fieldErrors,
  isFormLevelError,
} from "../../api/errors.ts";
import { createOccurrence, occurrenceKeys } from "../../api/occurrences.ts";
import { venuesQuery } from "../../api/venues.ts";
import { Button } from "../../components/Button.tsx";
import { Field } from "../../components/Field.tsx";
import { Form } from "../../components/Form.tsx";
import { SelectField } from "../../components/SelectField.tsx";
import { textField } from "../../lib/form.ts";
import { toInstant } from "../../lib/time.ts";

interface CreateOccurrenceFormProps {
  organizationId: string;
  eventId: string;
}

const createMessages = {
  "/problems/event-archived": "Arşivlenmiş etkinliğe gösterim eklenemez",
  "/problems/venue-not-found": "Mekân bulunamadı; liste yenilendi",
};

export function CreateOccurrenceForm({
  organizationId,
  eventId,
}: CreateOccurrenceFormProps) {
  const queryClient = useQueryClient();
  const venues = useQuery(venuesQuery(organizationId));

  const mutation = useMutation({
    mutationFn: (body: CreateOccurrenceInput) =>
      createOccurrence(organizationId, eventId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: occurrenceKeys.all(organizationId, eventId),
      }),
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const venueId = textField(data, "venueId");
    const endsAt = textField(data, "endsAt");

    // The wall time the admin typed belongs to the venue's clock, not to the
    // browser's. The venue list is loaded, or this form would not render.
    const venue = venues.data?.find((v) => v.id === venueId);
    if (!venue) throw new Error("selected venue missing from the loaded list");

    mutation.mutate(
      {
        venueId,
        startsAt: toInstant(textField(data, "startsAt"), venue.timezone),
        endsAt: endsAt ? toInstant(endsAt, venue.timezone) : undefined,
      },
      { onSuccess: () => form.reset() },
    );
  }

  const errors = fieldErrors(mutation.error);

  if (venues.isPending) return <p>Yükleniyor…</p>;
  if (venues.isError) {
    return <p role="alert">{describeError(venues.error)}</p>;
  }
  if (venues.data.length === 0) {
    return <p>Gösterim eklemek için önce organizasyona bir mekân ekle.</p>;
  }

  return (
    <Form onSubmit={handleSubmit}>
      <SelectField label="Mekân" name="venueId" required error={errors.venueId}>
        {venues.data.map((venue) => (
          <option key={venue.id} value={venue.id}>
            {venue.name} ({venue.timezone})
          </option>
        ))}
      </SelectField>
      <Field
        label="Başlangıç"
        name="startsAt"
        type="datetime-local"
        required
        error={errors.startsAt}
      />
      <Field
        label="Bitiş"
        name="endsAt"
        type="datetime-local"
        error={errors.endsAt}
      />
      {mutation.isError && isFormLevelError(mutation.error) && (
        <p role="alert">{describeError(mutation.error, createMessages)}</p>
      )}
      <Button busy={mutation.isPending}>
        {mutation.isPending ? "Ekleniyor…" : "Gösterim ekle"}
      </Button>
    </Form>
  );
}
