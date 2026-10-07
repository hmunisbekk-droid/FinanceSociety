"use client";

import { Check, RotateCcw } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { setTopicCompleted } from "../../../actions";

export function CompletedToggle({ topicId, completed, path }: { topicId: string; completed: boolean; path: string }) {
  return (
    <form action={setTopicCompleted}>
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="completed" value={completed ? "false" : "true"} />
      {completed ? (
        <SubmitButton variant="secondary" pendingText="Saving…">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Mark as not completed
        </SubmitButton>
      ) : (
        <SubmitButton pendingText="Saving…">
          <Check className="h-4 w-4" aria-hidden="true" />
          Mark as completed
        </SubmitButton>
      )}
    </form>
  );
}
