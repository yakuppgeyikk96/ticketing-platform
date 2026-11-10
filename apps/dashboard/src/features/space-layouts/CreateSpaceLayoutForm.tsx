import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateSpaceLayoutInput } from "@ticketing/contracts";
import type { SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  describeError,
  fieldErrors,
  isFormLevelError,
} from "../../api/errors.ts";
import { createSpaceLayout, spaceLayoutKeys } from "../../api/space-layouts.ts";
import { Button } from "../../components/Button.tsx";
import { Field } from "../../components/Field.tsx";
import { Form } from "../../components/Form.tsx";
import { textField } from "../../lib/form.ts";

interface Props {
  organizationId: string;
  venueId: string;
  spaceId: string;
  onClose: () => void;
}

export function CreateSpaceLayoutForm({
  organizationId,
  venueId,
  spaceId,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: CreateSpaceLayoutInput) =>
      createSpaceLayout(organizationId, venueId, spaceId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: spaceLayoutKeys.all(organizationId, venueId, spaceId),
      }),
  });
  const errors = fieldErrors(mutation.error);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const data = new FormData(event.currentTarget);
    mutation.mutate(
      {
        name: textField(data, "name"),
        width: Number(textField(data, "width")),
        height: Number(textField(data, "height")),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Field
        name="name"
        label={t("layouts.form.name")}
        required
        minLength={2}
        maxLength={200}
        autoFocus
        error={errors.name}
      />
      <Field
        name="width"
        label={t("layouts.form.width")}
        type="number"
        required
        min={1}
        max={2_147_483_647}
        step={1}
        defaultValue={1200}
        hint={t("layouts.form.dimensionsHint")}
        error={errors.width}
      />
      <Field
        name="height"
        label={t("layouts.form.height")}
        type="number"
        required
        min={1}
        max={2_147_483_647}
        step={1}
        defaultValue={800}
        error={errors.height}
      />
      {mutation.isError && isFormLevelError(mutation.error) && (
        <Form.Error>{describeError(mutation.error, t)}</Form.Error>
      )}
      <Form.Actions>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button busy={mutation.isPending}>
          {mutation.isPending ? t("common.adding") : t("layouts.form.submit")}
        </Button>
      </Form.Actions>
    </Form>
  );
}
