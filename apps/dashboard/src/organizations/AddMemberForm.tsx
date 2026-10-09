import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memberRoleSchema, type AddMemberInput } from "@ticketing/contracts";
import { useId, type SubmitEvent } from "react";
import { describeError, fieldErrors, isFormLevelError } from "../api/errors.ts";
import { addMember, organizationKeys } from "../api/organizations.ts";
import { Button } from "../components/Button.tsx";
import { Field } from "../components/Field.tsx";
import { textField } from "../lib/form.ts";

interface AddMemberFormProps {
  organizationId: string;
}

const addMemberMessages = {
  "/problems/user-not-found": "Bu e-postayla kayıtlı hesap yok",
  "/problems/already-member": "Bu kullanıcı zaten üye",
};

export function AddMemberForm({ organizationId }: AddMemberFormProps) {
  const queryClient = useQueryClient();
  const roleId = useId();

  const mutation = useMutation({
    // organizationId comes from the closure; the caller only decides who and as what.
    mutationFn: (body: AddMemberInput) => addMember(organizationId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: organizationKeys.members(organizationId),
      }),
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    mutation.mutate(
      {
        email: textField(formData, "email"),
        // The <select> only offers schema values, but the DOM can be edited;
        // parse narrows to MemberRole and throws on anything else.
        role: memberRoleSchema.parse(textField(formData, "role")),
      },
      { onSuccess: () => form.reset() },
    );
  }

  const errors = fieldErrors(mutation.error);

  return (
    <form onSubmit={handleSubmit}>
      <h3>Üye ekle</h3>
      <Field
        label="E-posta"
        name="email"
        type="email"
        required
        maxLength={254}
        error={errors.email}
      />
      <div>
        <label htmlFor={roleId}>Rol</label>
        <select id={roleId} name="role" defaultValue="staff">
          {memberRoleSchema.options.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
      {mutation.isError && isFormLevelError(mutation.error) && (
        <p role="alert">{describeError(mutation.error, addMemberMessages)}</p>
      )}
      <Button busy={mutation.isPending}>
        {mutation.isPending ? "Ekleniyor…" : "Ekle"}
      </Button>
    </form>
  );
}
