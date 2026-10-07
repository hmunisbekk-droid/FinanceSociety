"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui";
import type { ComponentProps } from "react";

/** Submit button that shows a spinner while its form's server action runs. */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
