import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubmitEvent } from "react";
import { describeError, fieldErrors, isFormLevelError } from "../api/errors.ts";
import { createOrganization, organizationKeys } from "../api/organizations.ts";
import { Button } from "../components/Button.tsx";
import { Field } from "../components/Field.tsx";
import { textField } from "../lib/form.ts";

export function CreateOrganizationForm() {
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
      { onSuccess: () => form.reset() },
    );
  }

  // Field validation goes under its input; anything else under the form.
  const errors = fieldErrors(mutation.error);

  return (
    <form onSubmit={handleSubmit}>
      <Field
        label="Organizasyon adı"
        name="name"
        required
        minLength={2}
        maxLength={100}
        error={errors.name}
      />
      {mutation.isError && isFormLevelError(mutation.error) && (
        <p role="alert">{describeError(mutation.error)}</p>
      )}
      <Button busy={mutation.isPending}>
        {mutation.isPending ? "Oluşturuluyor…" : "Oluştur"}
      </Button>
    </form>
  );
}
