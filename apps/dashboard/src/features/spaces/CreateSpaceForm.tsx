import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateSpaceInput } from "@ticketing/contracts";
import type { SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  describeError,
  fieldErrors,
  isFormLevelError,
} from "../../api/errors.ts";
import { createSpace, spaceKeys } from "../../api/spaces.ts";
import { Button } from "../../components/Button.tsx";
import { Field } from "../../components/Field.tsx";
import { Form } from "../../components/Form.tsx";
import { textField } from "../../lib/form.ts";

interface CreateSpaceFormProps {
  organizationId: string;
  venueId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateSpaceForm({
  organizationId,
  venueId,
  onSuccess,
  onCancel,
}: CreateSpaceFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: CreateSpaceInput) =>
      createSpace(organizationId, venueId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: spaceKeys.all(organizationId, venueId),
      }),
  });
  const errors = fieldErrors(mutation.error);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const data = new FormData(event.currentTarget);
    const capacity = textField(data, "capacity");
    mutation.mutate(
      {
        name: textField(data, "name"),
        description: textField(data, "description") || undefined,
        capacity: capacity ? Number(capacity) : undefined,
      },
      { onSuccess },
    );
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Field
        label={t("spaces.form.name")}
        name="name"
        required
        minLength={2}
        maxLength={200}
        autoFocus
        error={errors.name}
      />
      <Field
        label={t("spaces.form.description")}
        name="description"
        maxLength={5000}
        error={errors.description}
      />
      <Field
        label={t("spaces.form.capacity")}
        name="capacity"
        type="number"
        min={1}
        step={1}
        hint={t("spaces.form.capacityHint")}
        error={errors.capacity}
      />
      {mutation.isError && isFormLevelError(mutation.error) && (
        <Form.Error>{describeError(mutation.error, t)}</Form.Error>
      )}
      <Form.Actions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button busy={mutation.isPending} disabled={mutation.isPending}>
          {mutation.isPending ? t("common.adding") : t("spaces.form.submit")}
        </Button>
      </Form.Actions>
    </Form>
  );
}
