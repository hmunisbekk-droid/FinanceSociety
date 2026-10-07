"use client";

import { useActionState } from "react";
import { Check, Users } from "lucide-react";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { cancelRegistration, registerForEvent } from "../actions";

export function RegisterPanel({
  eventId,
  slug,
  isRegistered,
  isFull,
  taken,
  capacity,
}: {
  eventId: string;
  slug: string;
  isRegistered: boolean;
  isFull: boolean;
  taken: number;
  capacity: number | null;
}) {
  const [registerState, registerAction] = useActionState(registerForEvent, null);
  const [cancelState, cancelAction] = useActionState(cancelRegistration, null);

  const seatsText =
    capacity === null
      ? `${taken} registered · no limit`
      : `${Math.max(capacity - taken, 0)} of ${capacity} places left`;

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
        {seatsText}
      </p>

      {registerState?.status === "registered" && <Alert tone="success">You are registered. See you there!</Alert>}
      {registerState?.status === "full" && <Alert tone="error">Sorry, this event is full.</Alert>}
      {registerState?.status === "past" && <Alert tone="error">This event has already taken place.</Alert>}
      {registerState?.error && <Alert tone="error">{registerState.error}</Alert>}
      {cancelState?.status === "cancelled" && <Alert tone="info">Your registration has been cancelled.</Alert>}
      {cancelState?.error && <Alert tone="error">{cancelState.error}</Alert>}

      {isRegistered ? (
        <form action={cancelAction} className="flex flex-col gap-2">
          <p className="flex items-center gap-2 font-medium text-green-700">
            <Check className="h-5 w-5" aria-hidden="true" />
            You are registered
          </p>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="slug" value={slug} />
          <SubmitButton variant="secondary" pendingText="Cancelling…">
            Cancel my registration
          </SubmitButton>
        </form>
      ) : (
        <form action={registerAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="slug" value={slug} />
          <SubmitButton variant="accent" size="lg" className="w-full" disabled={isFull} pendingText="Registering…">
            {isFull ? "Event is full" : "Register"}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
