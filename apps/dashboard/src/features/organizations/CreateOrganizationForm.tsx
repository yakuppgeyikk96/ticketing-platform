import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubmitEvent } from "react";
import {
  describeError,
  fieldErrors,
  isFormLevelError,
} from "../../api/errors.ts";
import {
  createOrganization,
  organizationKeys,
} from "../../api/organizations.ts";
import { Button } from "../../components/Button.tsx";
import { Form } from "../../components/Form.tsx";
import { Field } from "../../components/Field.tsx";
import { textField } from "../../lib/form.ts";

interface CreateOrganizationFormProps {
  onSuccess?: () => void;
  // Given when the form sits in a dialog: shows a "Vazgeç" button.
  onCancel?: () => void;
}

export function CreateOrganizationForm({
  onSuccess,
  onCancel,
}: CreateOrganizationFormProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createOrganization,
    // Runs on every successful call: mark every "organizations" query stale so
    // whoever shows one refetches. The form does not know the list exists.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // Captured now: event.currentTarget is null once the handler has returned.
    const form = event.currentTarget;

    mutation.mutate(
      { name: textField(new FormData(form), "name") },
      // Runs for this call only, and only if the component is still mounted.
      {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      },
    );
  }

  // Field validation goes under its input; anything else under the form.
  const errors = fieldErrors(mutation.error);

  return (
    <Form onSubmit={handleSubmit}>
      <Field
        label="Organizasyon adı"
        name="name"
        required
        minLength={2}
        maxLength={100}
        autoFocus
        hint="Slug addan türetilir ve sonradan değiştirilemez."
        error={errors.name}
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
