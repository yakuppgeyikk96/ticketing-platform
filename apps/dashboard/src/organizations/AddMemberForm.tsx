import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memberRoleSchema, type AddMemberInput } from "@ticketing/contracts";
import type { SubmitEvent } from "react";
import { describeError } from "../api/errors.ts";
import { addMember, organizationKeys } from "../api/organizations.ts";
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

  return (
    <form onSubmit={handleSubmit}>
      <h3>Üye ekle</h3>
      <div>
        <label htmlFor="member-email">E-posta</label>
        <input
          id="member-email"
          name="email"
          type="email"
          required
          maxLength={254}
        />
      </div>
      <div>
        <label htmlFor="member-role">Rol</label>
        <select id="member-role" name="role" defaultValue="staff">
          {memberRoleSchema.options.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
      {mutation.isError && (
        <p role="alert">{describeError(mutation.error, addMemberMessages)}</p>
      )}
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Ekleniyor…" : "Ekle"}
      </button>
    </form>
  );
}
