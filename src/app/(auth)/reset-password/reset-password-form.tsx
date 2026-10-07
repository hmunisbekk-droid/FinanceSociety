"use client";

import { useActionState } from "react";
import { resetPassword } from "../actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPassword, null);
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="New password" htmlFor="password" error={errors.password} hint="At least 8 characters">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={!!errors.password}
        />
      </Field>

      <Field label="Repeat the new password" htmlFor="confirm" error={errors.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!errors.confirm} />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingText="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
