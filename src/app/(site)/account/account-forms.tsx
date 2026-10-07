"use client";

import { useActionState } from "react";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { changePassword, updateProfile } from "./actions";

export function ProfileForm({
  fullName,
  programme,
  levelId,
  levels,
}: {
  fullName: string;
  programme: string;
  levelId: string;
  levels: Array<{ id: string; label: string }>;
}) {
  const [state, action] = useActionState(updateProfile, null);
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && <Alert tone="success">{state.message}</Alert>}
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
        <Input id="fullName" name="fullName" defaultValue={fullName} autoComplete="name" required aria-invalid={!!errors.fullName} />
      </Field>

      <Field label="Programme" htmlFor="programme" error={errors.programme} hint="For example BSc Finance">
        <Input id="programme" name="programme" defaultValue={programme} aria-invalid={!!errors.programme} />
      </Field>

      <Field label="Current level" htmlFor="levelId" error={errors.levelId} hint="Your level is highlighted across the site">
        <Select id="levelId" name="levelId" defaultValue={levelId} aria-invalid={!!errors.levelId}>
          <option value="">Not set</option>
          {levels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.label}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && <Alert tone="success">{state.message}</Alert>}
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Current password" htmlFor="current" error={errors.current}>
        <Input id="current" name="current" type="password" autoComplete="current-password" required aria-invalid={!!errors.current} />
      </Field>

      <Field label="New password" htmlFor="password" error={errors.password} hint="At least 8 characters">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required aria-invalid={!!errors.password} />
      </Field>

      <Field label="Repeat the new password" htmlFor="confirm" error={errors.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!errors.confirm} />
      </Field>

      <SubmitButton variant="secondary" pendingText="Changing…">
        Change password
      </SubmitButton>
    </form>
  );
}
