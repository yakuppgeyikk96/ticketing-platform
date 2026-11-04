import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateOccurrenceInput } from "@ticketing/contracts";
import { useState, type SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
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
import { spacesQuery } from "../../api/spaces.ts";

interface CreateOccurrenceFormProps {
  organizationId: string;
  eventId: string;
  onSuccess?: () => void;
  // Given when the form sits in a dialog: shows a cancel button.
  onCancel?: () => void;
}

export function CreateOccurrenceForm({
  organizationId,
  eventId,
  onSuccess,
  onCancel,
}: CreateOccurrenceFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [venueId, setVenueId] = useState("");
  const [spaceId, setSpaceId] = useState("");

  const venues = useQuery(venuesQuery(organizationId));
  const spaces = useQuery({
    ...spacesQuery(organizationId, venueId),
    enabled: venueId !== "",
  });

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
    const endsAt = textField(data, "endsAt");

    // The wall time the admin typed belongs to the venue's clock, not to the
    // browser's. The venue list is loaded, or this form would not render.
    const venue = venues.data?.find((v) => v.id === venueId);
    if (!venue) throw new Error("selected venue missing from the loaded list");

    const space = spaces.data?.find(
      (item) => item.id === spaceId && item.venueId === venueId,
    );

    if (!space || mutation.isPending) return;

    mutation.mutate(
      {
        spaceId: space.id,
        startsAt: toInstant(textField(data, "startsAt"), venue.timezone),
        endsAt: endsAt ? toInstant(endsAt, venue.timezone) : undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          setVenueId("");
          setSpaceId("");
          onSuccess?.();
        },
      },
    );
  }

  const errors = fieldErrors(mutation.error);

  if (venues.isPending) return <p>{t("common.loading")}</p>;
  if (venues.isError) {
    return <p role="alert">{describeError(venues.error, t)}</p>;
  }
  if (venues.data.length === 0) {
    return <p>{t("occurrences.form.needVenue")}</p>;
  }

  return (
    <Form onSubmit={handleSubmit}>
      <SelectField
        label={t("occurrences.form.venue")}
        name="venueId"
        required
        autoFocus
        value={venueId}
        disabled={mutation.isPending}
        onChange={(event) => {
          setVenueId(event.target.value);
          setSpaceId("");
          mutation.reset();
        }}
      >
        <option value="">{t("occurrences.form.selectVenue")}</option>
        {venues.data.map((venue) => (
          <option key={venue.id} value={venue.id}>
            {venue.name} ({venue.timezone})
          </option>
        ))}
      </SelectField>

      {venueId && spaces.isPending && <p>{t("common.loading")}</p>}

      {venueId && spaces.isError && (
        <p role="alert">{describeError(spaces.error, t)}</p>
      )}

      {venueId &&
        spaces.isSuccess &&
        (spaces.data.length === 0 ? (
          <p>{t("occurrences.form.needSpace")}</p>
        ) : (
          <SelectField
            label={t("occurrences.form.space")}
            name="spaceId"
            required
            value={spaceId}
            disabled={mutation.isPending}
            error={errors.spaceId}
            onChange={(event) => setSpaceId(event.target.value)}
          >
            <option value="">{t("occurrences.form.selectSpace")}</option>
            {spaces.data.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </SelectField>
        ))}

      <Field
        label={t("occurrences.form.startsAt")}
        name="startsAt"
        type="datetime-local"
        required
        hint={t("occurrences.form.startsAtHint")}
        error={errors.startsAt}
      />
      <Field
        label={t("occurrences.form.endsAt")}
        name="endsAt"
        type="datetime-local"
        error={errors.endsAt}
      />
      {mutation.isError && isFormLevelError(mutation.error) && (
        <Form.Error>{describeError(mutation.error, t)}</Form.Error>
      )}
      <Form.Actions>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        )}
        <Button
          busy={mutation.isPending}
          disabled={
            mutation.isPending ||
            !spaces.isSuccess ||
            !spaces.data.some(
              (space) => space.id === spaceId && space.venueId === venueId,
            )
          }
        >
          {mutation.isPending
            ? t("common.adding")
            : t("occurrences.form.submit")}
        </Button>
      </Form.Actions>
    </Form>
  );
}
