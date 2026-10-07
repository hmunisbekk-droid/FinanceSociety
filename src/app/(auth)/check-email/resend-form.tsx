"use client";

import { useActionState } from "react";
import { resendVerification } from "../actions";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ResendForm({ email }: { email: string }) {
  const [state, action] = useActionState(resendVerification, null);

  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="email" value={email} />
      {state?.message && <Alert tone="success">{state.message}</Alert>}
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <SubmitButton variant="secondary" pendingText="Sending…">
        Send the link again
      </SubmitButton>
    </form>
  );
}
