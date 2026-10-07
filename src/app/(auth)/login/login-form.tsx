"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn } from "../actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(logIn, null);
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!errors.password}
        />
      </Field>

      <div className="flex items-center justify-between">
        <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
          Forgot your password?
        </Link>
      </div>

      <SubmitButton className="w-full" size="lg" pendingText="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}
