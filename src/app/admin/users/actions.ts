"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { describeDbError, withFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function back(formData: FormData) {
  const q = text(formData, "q");
  return q ? `/admin/users?q=${encodeURIComponent(q)}` : "/admin/users";
}

/** Change a user's role (FR-37). Admins cannot demote themselves. */
export async function updateUserRole(formData: FormData) {
  const userId = text(formData, "userId");
  const role = z.enum(["student", "editor", "admin"]).safeParse(formData.get("role"));
  if (!uuid.safeParse(userId).success || !role.success) redirect(back(formData));

  const me = await getCurrentUser();
  if (me?.id === userId && role.data !== "admin") redirect(withFlash(back(formData), { error: "You cannot remove your own admin role." }));

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role: role.data }).eq("id", userId);
  if (error) redirect(withFlash(back(formData), { error: describeDbError(error, "Could not change the role") }));

  revalidatePath("/admin/users");
  redirect(withFlash(back(formData), { ok: "Role updated." }));
}

export async function setUserBlocked(formData: FormData) {
  const userId = text(formData, "userId");
  const blocked = text(formData, "blocked") === "true";
  if (!uuid.safeParse(userId).success) redirect(back(formData));

  const me = await getCurrentUser();
  if (me?.id === userId) redirect(withFlash(back(formData), { error: "You cannot block yourself." }));

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_blocked: blocked }).eq("id", userId);
  if (error) redirect(withFlash(back(formData), { error: describeDbError(error, "Could not update the account") }));

  revalidatePath("/admin/users");
  redirect(withFlash(back(formData), { ok: blocked ? "Account blocked." : "Account unblocked." }));
}

/** Replace an editor's subject assignments (FR-36). */
export async function setEditorSubjects(formData: FormData) {
  const userId = text(formData, "userId");
  if (!uuid.safeParse(userId).success) redirect("/admin/users");
  const subjectIds = formData.getAll("subjects").map(String).filter((id) => uuid.safeParse(id).success);

  const supabase = await createClient();
  const { error: delError } = await supabase.from("editor_subjects").delete().eq("user_id", userId);
  if (delError) redirect(withFlash(`/admin/users/${userId}`, { error: describeDbError(delError, "Could not update assignments") }));
  if (subjectIds.length > 0) {
    const { error } = await supabase.from("editor_subjects").insert(subjectIds.map((subject_id) => ({ user_id: userId, subject_id })));
    if (error) redirect(withFlash(`/admin/users/${userId}`, { error: describeDbError(error, "Could not update assignments") }));
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/content");
  redirect(withFlash(`/admin/users/${userId}`, { ok: "Subjects assigned." }));
}
