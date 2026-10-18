import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateEventInput } from "@ticketing/contracts";
import { createEvent, eventKeys } from "../api/events.ts";
import { Form } from "../components/Form.tsx";
import { Field } from "../components/Field.tsx";
import { describeError, fieldErrors, isFormLevelError } from "../api/errors.ts";
import { Button } from "../components/Button.tsx";
import type { SubmitEvent } from "react";
import { textField } from "../lib/form.ts";

export function CreateEventForm({
  organizationId,
}: {
  organizationId: string;
}) {
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
      { onSuccess: () => form.reset() },
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
        <p role="alert">{describeError(mutation.error)}</p>
      )}
      <Button busy={mutation.isPending}>
        {mutation.isPending ? "Oluşturuluyor…" : "Oluştur"}
      </Button>
    </Form>
  );
}
