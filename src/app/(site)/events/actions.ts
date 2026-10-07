"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface RegistrationState {
  status?: "registered" | "cancelled" | "full" | "past";
  error?: string;
}

const schema = z.object({ eventId: z.string().uuid(), slug: z.string().regex(/^[a-z0-9-]+$/) });

/** One-click registration with the capacity check done in the database (FR-29). */
export async function registerForEvent(_prev: RegistrationState | null, formData: FormData): Promise<RegistrationState> {
  const parsed = schema.safeParse({ eventId: formData.get("eventId"), slug: formData.get("slug") });
  if (!parsed.success) return { error: "Event not found." };

  const user = await getCurrentUser();
  if (!user || user.profile.is_blocked) return { error: "Please log in to register." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_event", { p_event_id: parsed.data.eventId });
  if (error) return { error: "Could not register you. Please try again." };

  revalidatePath(`/events/${parsed.data.slug}`);
  revalidatePath("/events");
  revalidatePath("/my");
  return { status: data as RegistrationState["status"] };
}

export async function cancelRegistration(_prev: RegistrationState | null, formData: FormData): Promise<RegistrationState> {
  const parsed = schema.safeParse({ eventId: formData.get("eventId"), slug: formData.get("slug") });
  if (!parsed.success) return { error: "Event not found." };

  const user = await getCurrentUser();
  if (!user) return { error: "Please log in." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_event_registration", { p_event_id: parsed.data.eventId });
  if (error) return { error: "Could not cancel. Please try again." };

  revalidatePath(`/events/${parsed.data.slug}`);
  revalidatePath("/events");
  revalidatePath("/my");
  return { status: "cancelled" };
}
