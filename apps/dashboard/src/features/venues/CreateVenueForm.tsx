import { useMutation, useQueryClient } from "@tanstack/react-query";
import { validTimeZones, type CreateVenueInput } from "@ticketing/contracts";
import type { SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  describeError,
  fieldErrors,
  isFormLevelError,
} from "../../api/errors.ts";
import { createVenue, venueKeys } from "../../api/venues.ts";
import { Button } from "../../components/Button.tsx";
import { Field } from "../../components/Field.tsx";
import { Form } from "../../components/Form.tsx";
import { SelectField } from "../../components/SelectField.tsx";
import { textField } from "../../lib/form.ts";

// ~600 names; computed once, not on every render.
const timeZoneOptions = [...validTimeZones].sort();

interface CreateVenueFormProps {
  organizationId: string;
  onSuccess?: () => void;
  // Given when the form sits in a dialog: shows a cancel button.
  onCancel?: () => void;
}

export function CreateVenueForm({
  organizationId,
  onSuccess,
  onCancel,
}: CreateVenueFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: CreateVenueInput) => createVenue(organizationId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: venueKeys.all(organizationId),
      }),
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const capacity = textField(data, "capacity");

    mutation.mutate(
      {
        name: textField(data, "name"),
        // Empty optional fields stay out of the body: the server stores null.
        city: textField(data, "city") || undefined,
        address: textField(data, "address") || undefined,
        timezone: textField(data, "timezone"),
        capacity: capacity ? Number(capacity) : undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      },
    );
  }

  const errors = fieldErrors(mutation.error);

  return (
    <Form onSubmit={handleSubmit}>
      <Field
        label={t("venues.form.name")}
        name="name"
        required
        minLength={2}
        maxLength={100}
        autoFocus
        error={errors.name}
      />
      <Field
        label={t("venues.form.city")}
        name="city"
        maxLength={100}
        error={errors.city}
      />
      <Field
        label={t("venues.form.address")}
        name="address"
        maxLength={300}
        error={errors.address}
      />
      <SelectField
        label={t("venues.form.timezone")}
        name="timezone"
        defaultValue="Europe/Istanbul"
        error={errors.timezone}
      >
        {timeZoneOptions.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </SelectField>
      <Field
        label={t("venues.form.capacity")}
        name="capacity"
        type="number"
        min={1}
        max={1_000_000}
        hint={t("venues.form.capacityHint")}
        error={errors.capacity}
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
        <Button busy={mutation.isPending}>
          {mutation.isPending ? t("common.adding") : t("venues.form.submit")}
        </Button>
      </Form.Actions>
    </Form>
  );
}
