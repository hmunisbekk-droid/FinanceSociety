"use client";

import { useActionState } from "react";
import { Alert, Field, Input } from "@/components/ui";
import { ProgrammeLevelFields, type LevelOption } from "@/components/programme-level-fields";
import { SubmitButton } from "@/components/submit-button";
import { isProgramme } from "@/lib/programmes";
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
  levels: LevelOption[];
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

      <ProgrammeLevelFields levels={levels} initialProgramme={isProgramme(programme) ? programme : ""} initialLevelId={levelId} errors={errors} />

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
