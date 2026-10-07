"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface AccountState {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  programme: z.string().trim().max(120),
  levelId: z.union([z.string().uuid(), z.literal("")]),
});

/** Profile edits (FR-03). Role and email are protected by a database trigger. */
export async function updateProfile(_prev: AccountState | null, formData: FormData): Promise<AccountState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    programme: formData.get("programme") ?? "",
    levelId: formData.get("levelId") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      programme: parsed.data.programme || null,
      level_id: parsed.data.levelId || null,
    })
    .eq("id", user.id);
  if (error) return { error: "Could not save your profile. Please try again." };

  revalidatePath("/", "layout");
  return { message: "Profile saved." };
}

const passwordSchema = z.object({
  current: z.string().min(1, "Enter your current password"),
  password: z.string().min(8, "Use at least 8 characters"),
  confirm: z.string(),
});

export async function changePassword(_prev: AccountState | null, formData: FormData): Promise<AccountState> {
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  if (parsed.data.password !== parsed.data.confirm) return { fieldErrors: { confirm: "Passwords do not match" } };

  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };

  const supabase = await createClient();
  // Confirm the current password before changing it.
  const { error: checkError } = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.current });
  if (checkError) return { fieldErrors: { current: "That is not your current password" } };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  return { message: "Password changed." };
}
