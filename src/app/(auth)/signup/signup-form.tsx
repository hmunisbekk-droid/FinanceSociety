"use client";

import { useActionState } from "react";
import { signUp } from "../actions";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function SignupForm({
  levels,
  domains,
}: {
  levels: Array<{ id: string; label: string }>;
  domains: string[];
}) {
  const [state, action] = useActionState(signUp, null);
  const errors = state?.fieldErrors ?? {};
  const emailHint = domains.length > 0 ? `Use your WIUT email (${domains.map((d) => "@" + d).join(", ")})` : undefined;

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required aria-invalid={!!errors.fullName} />
      </Field>

      <Field label="Email" htmlFor="email" error={errors.email} hint={emailHint}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters">
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

      <Field label="Programme" htmlFor="programme" error={errors.programme} hint="For example BSc Finance">
        <Input id="programme" name="programme" autoComplete="organization-title" aria-invalid={!!errors.programme} />
      </Field>

      {levels.length > 0 && (
        <Field label="Current level" htmlFor="levelId" error={errors.levelId}>
          <Select id="levelId" name="levelId" defaultValue="" aria-invalid={!!errors.levelId}>
            <option value="">Choose your level</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <SubmitButton className="w-full" size="lg" pendingText="Creating your account…">
        Create account
      </SubmitButton>

      <p className="text-center text-xs text-slate-500">
        We store only your name, email, programme and level. See the privacy notice.
      </p>
    </form>
  );
}
