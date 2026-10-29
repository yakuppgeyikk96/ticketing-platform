import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateEventInput } from "@ticketing/contracts";
import type { SubmitEvent } from "react";
import {
  describeError,
  fieldErrors,
  isFormLevelError,
} from "../../api/errors.ts";
import { createEvent, eventKeys } from "../../api/events.ts";
import { Button } from "../../components/Button.tsx";
import { Field } from "../../components/Field.tsx";
import { Form } from "../../components/Form.tsx";
import { textField } from "../../lib/form.ts";

interface CreateEventFormProps {
  organizationId: string;
  onSuccess?: () => void;
  // Given when the form sits in a dialog: shows a "Vazgeç" button.
  onCancel?: () => void;
}

export function CreateEventForm({
  organizationId,
  onSuccess,
  onCancel,
}: CreateEventFormProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: CreateEventInput) => createEvent(organizationId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: eventKeys.all(organizationId),
      }),
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    mutation.mutate(
      {
        title: textField(formData, "title"),
        description: textField(formData, "description") || undefined,
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
        label="Başlık"
        name="title"
        type="text"
        required
        minLength={2}
        maxLength={200}
        autoFocus
        hint="Slug başlıktan türetilir."
        error={errors.title}
      />
      <Field
        label="Açıklama"
        name="description"
        type="text"
        maxLength={5000}
        error={errors.description}
      />
      {mutation.isError && isFormLevelError(mutation.error) && (
        <Form.Error>{describeError(mutation.error)}</Form.Error>
      )}
      <Form.Actions>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
        <Button busy={mutation.isPending}>
          {mutation.isPending ? "Oluşturuluyor…" : "Oluştur"}
        </Button>
      </Form.Actions>
    </Form>
  );
}
