"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { describeDbError, withFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const status = z.enum(["draft", "review", "published"]);

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateTopic(topicId: string) {
  revalidatePath(`/admin/content/topics/${topicId}`);
  revalidatePath("/learn", "layout");
}

async function nextSortOrder(table: "materials" | "questions", key: "topic_id" | "quiz_id", parentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from(table).select("sort_order").eq(key, parentId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  return ((data as { sort_order: number } | null)?.sort_order ?? 0) + 1;
}

async function renumber(table: "materials" | "questions", key: "topic_id" | "quiz_id", parentId: string, movedId: string, direction: "up" | "down") {
  const supabase = await createClient();
  const { data } = await supabase.from(table).select("id").eq(key, parentId).order("sort_order");
  const ids = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  const index = ids.indexOf(movedId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  await Promise.all(ids.map((id, i) => supabase.from(table).update({ sort_order: i + 1 }).eq("id", id)));
}

// ---------------------------------------------------------------------------
// Materials (FR-15 … FR-18)
// ---------------------------------------------------------------------------
const linkMaterialSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("video"), title: z.string().trim().min(1, "Enter a title").max(160), url: z.string().trim().url("Enter a valid link") }),
  z.object({ type: z.literal("link"), title: z.string().trim().min(1, "Enter a title").max(160), url: z.string().trim().url("Enter a valid link") }),
  z.object({ type: z.literal("notes"), title: z.string().trim().min(1, "Enter a title").max(160), body: z.string().trim().min(1, "Write the notes").max(20000) }),
]);

export async function addLinkMaterial(formData: FormData) {
  const topicId = text(formData, "topicId");
  if (!uuid.safeParse(topicId).success) redirect("/admin/content");
  const back = `/admin/content/topics/${topicId}#materials`;

  const parsed = linkMaterialSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    url: formData.get("url"),
    body: formData.get("body"),
  });
  if (!parsed.success) redirect(withFlash(back, { error: parsed.error.issues[0]?.message ?? "Check the form" }));

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("materials").insert({
    topic_id: topicId,
    type: parsed.data.type,
    title: parsed.data.title,
    external_url: parsed.data.type === "notes" ? null : parsed.data.url,
    body: parsed.data.type === "notes" ? parsed.data.body : null,
    sort_order: await nextSortOrder("materials", "topic_id", topicId),
    author_id: user?.id ?? null,
  });
  if (error) redirect(withFlash(back, { error: describeDbError(error, "Could not add the material") }));

  revalidateTopic(topicId);
  redirect(withFlash(back, { ok: "Material added." }));
}

const uploadedSchema = z.object({
  topicId: uuid,
  title: z.string().trim().min(1).max(160),
  type: z.enum(["pdf", "slides", "image"]),
  storagePath: z.string().min(1).max(300),
  fileSize: z.number().int().positive().max(20 * 1024 * 1024),
  allowDownload: z.boolean(),
});

/** Called by the browser after it has uploaded the file straight to Storage. */
export async function recordUploadedMaterial(input: z.infer<typeof uploadedSchema>): Promise<{ error?: string }> {
  const parsed = uploadedSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid upload details." };
  if (!parsed.data.storagePath.startsWith(`${parsed.data.topicId}/`)) return { error: "Invalid file path." };

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("materials").insert({
    topic_id: parsed.data.topicId,
    title: parsed.data.title,
    type: parsed.data.type,
    storage_path: parsed.data.storagePath,
    file_size: parsed.data.fileSize,
    allow_download: parsed.data.allowDownload,
    sort_order: await nextSortOrder("materials", "topic_id", parsed.data.topicId),
    author_id: user?.id ?? null,
  });
  if (error) return { error: describeDbError(error, "Could not save the material") };

  revalidateTopic(parsed.data.topicId);
  return {};
}

export async function updateMaterial(formData: FormData) {
  const id = text(formData, "id");
  const topicId = text(formData, "topicId");
  if (!uuid.safeParse(id).success || !uuid.safeParse(topicId).success) redirect("/admin/content");
  const back = `/admin/content/topics/${topicId}#materials`;

  const supabase = await createClient();
  const { error } = await supabase
    .from("materials")
    .update({
      allow_download: formData.get("allow_download") === "on",
      status: formData.get("status") === "draft" ? "draft" : "published",
    })
    .eq("id", id);
  if (error) redirect(withFlash(back, { error: describeDbError(error, "Could not save") }));
  revalidateTopic(topicId);
  redirect(withFlash(back, { ok: "Material updated." }));
}

export async function deleteMaterial(formData: FormData) {
  const id = text(formData, "id");
  const topicId = text(formData, "topicId");
  if (!uuid.safeParse(id).success || !uuid.safeParse(topicId).success) redirect("/admin/content");
  const back = `/admin/content/topics/${topicId}#materials`;

  const supabase = await createClient();
  const { data: material } = await supabase.from("materials").select("storage_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) redirect(withFlash(back, { error: describeDbError(error, "Could not delete") }));
  const path = (material as { storage_path: string | null } | null)?.storage_path;
  if (path) await supabase.storage.from("materials").remove([path]);

  revalidateTopic(topicId);
  redirect(withFlash(back, { ok: "Material removed." }));
}

export async function moveMaterial(formData: FormData) {
  const id = text(formData, "id");
  const topicId = text(formData, "topicId");
  const direction = text(formData, "direction") === "up" ? "up" : "down";
  if (uuid.safeParse(id).success && uuid.safeParse(topicId).success) {
    await renumber("materials", "topic_id", topicId, id, direction);
    revalidateTopic(topicId);
  }
  redirect(`/admin/content/topics/${topicId}#materials`);
}

// ---------------------------------------------------------------------------
// Quiz (FR-19 … FR-23, FR-34)
// ---------------------------------------------------------------------------
export async function createQuiz(formData: FormData) {
  const topicId = text(formData, "topicId");
  if (!uuid.safeParse(topicId).success) redirect("/admin/content");
  const back = `/admin/content/topics/${topicId}#quiz`;

  const supabase = await createClient();
  const { error } = await supabase.from("quizzes").insert({ topic_id: topicId, title: "Quiz" });
  if (error) redirect(withFlash(back, { error: describeDbError(error, "Could not create the quiz") }));
  revalidateTopic(topicId);
  redirect(withFlash(back, { ok: "Quiz created. Add questions below." }));
}

export async function updateQuiz(formData: FormData) {
  const id = text(formData, "id");
  const topicId = text(formData, "topicId");
  if (!uuid.safeParse(id).success || !uuid.safeParse(topicId).success) redirect("/admin/content");
  const back = `/admin/content/topics/${topicId}#quiz`;

  const parsed = z
    .object({ title: z.string().trim().min(1, "Enter a title").max(120), status })
    .safeParse({ title: formData.get("title"), status: formData.get("status") });
  if (!parsed.success) redirect(withFlash(back, { error: parsed.error.issues[0]?.message ?? "Check the form" }));

  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .update({
      title: parsed.data.title,
      status: parsed.data.status,
      shuffle_questions: formData.get("shuffle_questions") === "on",
      shuffle_options: formData.get("shuffle_options") === "on",
    })
    .eq("id", id);
  if (error) redirect(withFlash(back, { error: describeDbError(error, "Could not save the quiz") }));
  revalidateTopic(topicId);
  redirect(withFlash(back, { ok: "Quiz settings saved." }));
}

const optionSchema = z.object({ text: z.string().trim().min(1, "Every option needs text").max(500), correct: z.boolean() });

const questionSchema = z
  .object({
    id: uuid.optional(),
    quizId: uuid,
    topicId: uuid,
    type: z.enum(["single", "multiple", "true_false", "numeric"]),
    prompt: z.string().trim().min(3, "Write the question").max(2000),
    explanation: z.string().trim().max(5000),
    points: z.number().positive("Points must be positive").max(100),
    options: z.array(optionSchema).max(10),
    numericAnswer: z.number().nullable(),
    tolerance: z.number().min(0).nullable(),
    toleranceType: z.enum(["absolute", "percent"]).nullable(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "numeric") {
      if (q.numericAnswer === null) ctx.addIssue({ code: "custom", message: "Enter the correct number", path: ["numericAnswer"] });
      return;
    }
    if (q.options.length < 2) ctx.addIssue({ code: "custom", message: "Add at least two options", path: ["options"] });
    const correct = q.options.filter((o) => o.correct).length;
    if (q.type === "multiple" && correct < 1) ctx.addIssue({ code: "custom", message: "Mark at least one option as correct", path: ["options"] });
    if (q.type !== "multiple" && correct !== 1) ctx.addIssue({ code: "custom", message: "Mark exactly one option as correct", path: ["options"] });
  });

export type QuestionPayload = z.input<typeof questionSchema>;

/** Creates or replaces a question with its options. Called from the question editor. */
export async function saveQuestion(input: QuestionPayload): Promise<{ error?: string; ok?: true }> {
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the question" };
  const q = parsed.data;

  const supabase = await createClient();
  const row = {
    quiz_id: q.quizId,
    type: q.type,
    prompt: q.prompt,
    explanation: q.explanation,
    points: q.points,
    numeric_answer: q.type === "numeric" ? q.numericAnswer : null,
    tolerance: q.type === "numeric" ? q.tolerance : null,
    tolerance_type: q.type === "numeric" && q.tolerance !== null ? (q.toleranceType ?? "absolute") : null,
  };

  let questionId = q.id;
  if (questionId) {
    const { error } = await supabase.from("questions").update(row).eq("id", questionId);
    if (error) return { error: describeDbError(error, "Could not save the question") };
    const { error: delError } = await supabase.from("question_options").delete().eq("question_id", questionId);
    if (delError) return { error: describeDbError(delError, "Could not replace the options") };
  } else {
    const { data, error } = await supabase
      .from("questions")
      .insert({ ...row, sort_order: await nextSortOrder("questions", "quiz_id", q.quizId) })
      .select("id")
      .single();
    if (error || !data) return { error: describeDbError(error, "Could not create the question") };
    questionId = data.id as string;
  }

  if (q.type !== "numeric") {
    const { error } = await supabase
      .from("question_options")
      .insert(q.options.map((o, i) => ({ question_id: questionId, text: o.text, is_correct: o.correct, sort_order: i + 1 })));
    if (error) return { error: describeDbError(error, "Could not save the options") };
  }

  revalidateTopic(q.topicId);
  return { ok: true };
}

export async function deleteQuestion(formData: FormData) {
  const id = text(formData, "id");
  const topicId = text(formData, "topicId");
  if (!uuid.safeParse(id).success || !uuid.safeParse(topicId).success) redirect("/admin/content");
  const back = `/admin/content/topics/${topicId}#quiz`;
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) redirect(withFlash(back, { error: describeDbError(error, "Could not delete") }));
  revalidateTopic(topicId);
  redirect(withFlash(back, { ok: "Question deleted." }));
}

export async function moveQuestion(formData: FormData) {
  const id = text(formData, "id");
  const quizId = text(formData, "quizId");
  const topicId = text(formData, "topicId");
  const direction = text(formData, "direction") === "up" ? "up" : "down";
  if (uuid.safeParse(id).success && uuid.safeParse(quizId).success) {
    await renumber("questions", "quiz_id", quizId, id, direction);
    revalidateTopic(topicId);
  }
  redirect(`/admin/content/topics/${topicId}#quiz`);
}
