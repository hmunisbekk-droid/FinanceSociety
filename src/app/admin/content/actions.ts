"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { describeDbError, withFlash } from "@/lib/flash";
import { slugify, uniqueSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const status = z.enum(["draft", "review", "published"]);

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function renumber(table: "subjects" | "topics", parentKey: "level_id" | "subject_id", parentId: string, movedId: string, direction: "up" | "down") {
  const supabase = await createClient();
  const { data } = await supabase.from(table).select("id, sort_order").eq(parentKey, parentId).order("sort_order");
  const ids = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  const index = ids.indexOf(movedId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  await Promise.all(ids.map((id, i) => supabase.from(table).update({ sort_order: i + 1 }).eq("id", id)));
}

function revalidateContent() {
  revalidatePath("/admin", "layout");
  revalidatePath("/learn", "layout");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Subjects (admin, FR-33)
// ---------------------------------------------------------------------------
export async function createSubject(formData: FormData) {
  const levelId = text(formData, "levelId");
  const name = text(formData, "name");
  if (!uuid.safeParse(levelId).success || name.length < 2) {
    redirect(withFlash("/admin/content", { error: "Enter a subject name." }));
  }

  const supabase = await createClient();
  const slug = await uniqueSlug(slugify(name), async (s) => {
    const { data } = await supabase.from("subjects").select("id").eq("level_id", levelId).eq("slug", s).maybeSingle();
    return Boolean(data);
  });
  const { data: last } = await supabase.from("subjects").select("sort_order").eq("level_id", levelId).order("sort_order", { ascending: false }).limit(1).maybeSingle();

  const { data, error } = await supabase
    .from("subjects")
    .insert({ level_id: levelId, name, slug, description: text(formData, "description"), sort_order: ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error || !data) redirect(withFlash("/admin/content", { error: describeDbError(error, "Could not create the subject") }));

  revalidateContent();
  redirect(withFlash(`/admin/content/subjects/${data.id}`, { ok: "Subject created. Add its topics below." }));
}

export async function updateSubject(formData: FormData) {
  const id = text(formData, "id");
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Enter a name").max(120),
      slug: z.string().trim().max(80),
      description: z.string().trim().max(2000),
      status,
    })
    .safeParse({ name: formData.get("name"), slug: formData.get("slug"), description: formData.get("description"), status: formData.get("status") });
  if (!uuid.safeParse(id).success) redirect("/admin/content");
  if (!parsed.success) redirect(withFlash(`/admin/content/subjects/${id}`, { error: parsed.error.issues[0]?.message ?? "Check the form" }));

  const supabase = await createClient();
  const { error } = await supabase
    .from("subjects")
    .update({ ...parsed.data, slug: slugify(parsed.data.slug || parsed.data.name) })
    .eq("id", id);
  if (error) redirect(withFlash(`/admin/content/subjects/${id}`, { error: describeDbError(error, "Could not save") }));

  revalidateContent();
  redirect(withFlash(`/admin/content/subjects/${id}`, { ok: "Subject saved." }));
}

export async function deleteSubject(formData: FormData) {
  const id = text(formData, "id");
  if (!uuid.safeParse(id).success) redirect("/admin/content");
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) redirect(withFlash(`/admin/content/subjects/${id}`, { error: describeDbError(error, "Could not delete") }));
  revalidateContent();
  redirect(withFlash("/admin/content", { ok: "Subject deleted." }));
}

export async function moveSubject(formData: FormData) {
  const id = text(formData, "id");
  const levelId = text(formData, "levelId");
  const direction = text(formData, "direction") === "up" ? "up" : "down";
  if (uuid.safeParse(id).success && uuid.safeParse(levelId).success) {
    await renumber("subjects", "level_id", levelId, id, direction);
    revalidateContent();
  }
  redirect("/admin/content");
}

// ---------------------------------------------------------------------------
// Topics (editors + admins)
// ---------------------------------------------------------------------------
export async function createTopic(formData: FormData) {
  const subjectId = text(formData, "subjectId");
  const title = text(formData, "title");
  const back = `/admin/content/subjects/${subjectId}`;
  if (!uuid.safeParse(subjectId).success) redirect("/admin/content");
  if (title.length < 2) redirect(withFlash(back, { error: "Enter a topic title." }));

  const user = await getCurrentUser();
  const supabase = await createClient();
  const slug = await uniqueSlug(slugify(title), async (s) => {
    const { data } = await supabase.from("topics").select("id").eq("subject_id", subjectId).eq("slug", s).maybeSingle();
    return Boolean(data);
  });
  const { data: last } = await supabase.from("topics").select("sort_order").eq("subject_id", subjectId).order("sort_order", { ascending: false }).limit(1).maybeSingle();

  const { data, error } = await supabase
    .from("topics")
    .insert({
      subject_id: subjectId,
      title,
      slug,
      sort_order: ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1,
      author_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) redirect(withFlash(back, { error: describeDbError(error, "Could not create the topic") }));

  revalidateContent();
  redirect(withFlash(`/admin/content/topics/${data.id}`, { ok: "Topic created. Fill in the summary, add materials and build the quiz." }));
}

export async function updateTopic(formData: FormData) {
  const id = text(formData, "id");
  if (!uuid.safeParse(id).success) redirect("/admin/content");
  const back = `/admin/content/topics/${id}`;

  const parsed = z
    .object({
      title: z.string().trim().min(2, "Enter a title").max(160),
      slug: z.string().trim().max(80),
      summary: z.string().trim().max(10000),
      key_formulas: z.string().trim().max(10000),
      worked_example: z.string().trim().max(10000),
      status,
    })
    .safeParse({
      title: formData.get("title"),
      slug: formData.get("slug"),
      summary: formData.get("summary"),
      key_formulas: formData.get("key_formulas"),
      worked_example: formData.get("worked_example"),
      status: formData.get("status"),
    });
  if (!parsed.success) redirect(withFlash(back, { error: parsed.error.issues[0]?.message ?? "Check the form" }));

  const supabase = await createClient();
  const { error } = await supabase
    .from("topics")
    .update({ ...parsed.data, slug: slugify(parsed.data.slug || parsed.data.title) })
    .eq("id", id);
  if (error) redirect(withFlash(back, { error: describeDbError(error, "Could not save") }));

  revalidateContent();
  redirect(withFlash(back, { ok: "Topic saved." }));
}

export async function deleteTopic(formData: FormData) {
  const id = text(formData, "id");
  const subjectId = text(formData, "subjectId");
  if (!uuid.safeParse(id).success) redirect("/admin/content");
  const supabase = await createClient();
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) redirect(withFlash(`/admin/content/topics/${id}`, { error: describeDbError(error, "Could not delete") }));
  revalidateContent();
  redirect(withFlash(uuid.safeParse(subjectId).success ? `/admin/content/subjects/${subjectId}` : "/admin/content", { ok: "Topic deleted." }));
}

export async function moveTopic(formData: FormData) {
  const id = text(formData, "id");
  const subjectId = text(formData, "subjectId");
  const direction = text(formData, "direction") === "up" ? "up" : "down";
  if (uuid.safeParse(id).success && uuid.safeParse(subjectId).success) {
    await renumber("topics", "subject_id", subjectId, id, direction);
    revalidateContent();
  }
  redirect(`/admin/content/subjects/${subjectId}`);
}
