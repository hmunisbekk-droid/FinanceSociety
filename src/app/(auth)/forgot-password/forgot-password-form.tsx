"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      {state?.message && <Alert tone="success">{state.message}</Alert>}
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
