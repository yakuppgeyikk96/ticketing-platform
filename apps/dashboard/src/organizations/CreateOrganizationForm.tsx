import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubmitEvent } from "react";
import { describeError } from "../api/errors.ts";
import { createOrganization } from "../api/organizations.ts";
import { textField } from "../lib/form.ts";

export function CreateOrganizationForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createOrganization,
    // Runs on every successful call: mark every "organizations" query stale so
    // whoever shows one refetches. The form does not know the list exists.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["organizations"] }),
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

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="name">Organizasyon adı</label>
      <input id="name" name="name" required minLength={2} maxLength={100} />
      {mutation.isError && <p role="alert">{describeError(mutation.error)}</p>}
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Oluşturuluyor…" : "Oluştur"}
      </button>
    </form>
  );
}
