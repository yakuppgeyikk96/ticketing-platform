import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memberRoleSchema, type AddMemberInput } from "@ticketing/contracts";
import type { SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  describeError,
  fieldErrors,
  isFormLevelError,
} from "../../api/errors.ts";
import { addMember, organizationKeys } from "../../api/organizations.ts";
import { Button } from "../../components/Button.tsx";
import { Field } from "../../components/Field.tsx";
import { Form } from "../../components/Form.tsx";
import { SelectField } from "../../components/SelectField.tsx";
import { textField } from "../../lib/form.ts";

interface AddMemberFormProps {
  organizationId: string;
  onSuccess?: () => void;
  // Given when the form sits in a dialog: shows a cancel button.
  onCancel?: () => void;
}

export function AddMemberForm({
  organizationId,
  onSuccess,
  onCancel,
}: AddMemberFormProps) {
  const { t } = useTranslation();
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
        label={t("members.form.email")}
        name="email"
        type="email"
        required
        maxLength={254}
        autoFocus
        hint={t("members.form.emailHint")}
        error={errors.email}
      />
      <SelectField
        label={t("members.form.role")}
        name="role"
        defaultValue="staff"
      >
        {memberRoleSchema.options.map((role) => (
          <option key={role} value={role}>
            {t(`roles.${role}`)}
          </option>
        ))}
      </SelectField>
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
          {mutation.isPending ? t("common.adding") : t("members.form.submit")}
        </Button>
      </Form.Actions>
    </Form>
  );
}
