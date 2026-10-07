"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui";

/** A submit button that asks for confirmation first (used for deletes). */
export function ConfirmButton({ message, onClick, ...props }: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
