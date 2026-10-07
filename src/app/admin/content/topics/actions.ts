"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { describeDbError, withFlash } from "@/lib/flash";
import { parseQuestionsCsv } from "@/lib/question-csv";
import { questionInputSchema, type QuestionInput } from "@/lib/question-schema";
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

const idsSchema = z.object({ id: uuid.optional(), quizId: uuid, topicId: uuid });

export type QuestionPayload = z.input<typeof idsSchema> & z.input<typeof questionInputSchema>;

type Db = Awaited<ReturnType<typeof createClient>>;

function questionRow(quizId: string, q: QuestionInput) {
  return {
    quiz_id: quizId,
    type: q.type,
    prompt: q.prompt,
    explanation: q.explanation,
    points: q.points,
    numeric_answer: q.type === "numeric" ? q.numericAnswer : null,
    tolerance: q.type === "numeric" ? q.tolerance : null,
    tolerance_type: q.type === "numeric" && q.tolerance !== null ? (q.toleranceType ?? "absolute") : null,
  };
}

/** Inserts a question and its options; returns an error sentence or null. */
async function insertQuestion(supabase: Db, quizId: string, q: QuestionInput, sortOrder: number): Promise<string | null> {
  const { data, error } = await supabase
    .from("questions")
    .insert({ ...questionRow(quizId, q), sort_order: sortOrder })
    .select("id")
    .single();
  if (error || !data) return describeDbError(error, "Could not create the question");
  if (q.type !== "numeric") {
    const { error: optError } = await supabase
      .from("question_options")
      .insert(q.options.map((o, i) => ({ question_id: data.id, text: o.text, is_correct: o.correct, sort_order: i + 1 })));
    if (optError) return describeDbError(optError, "Could not save the options");
  }
  return null;
}

/** Creates or replaces a question with its options. Called from the question editor. */
export async function saveQuestion(input: QuestionPayload): Promise<{ error?: string; ok?: true }> {
  const ids = idsSchema.safeParse(input);
  if (!ids.success) return { error: "Invalid question." };
  const parsed = questionInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the question" };
  const q = parsed.data;
  const { id, quizId, topicId } = ids.data;

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("questions").update(questionRow(quizId, q)).eq("id", id);
    if (error) return { error: describeDbError(error, "Could not save the question") };
    const { error: delError } = await supabase.from("question_options").delete().eq("question_id", id);
    if (delError) return { error: describeDbError(delError, "Could not replace the options") };
    if (q.type !== "numeric") {
      const { error: optError } = await supabase
        .from("question_options")
        .insert(q.options.map((o, i) => ({ question_id: id, text: o.text, is_correct: o.correct, sort_order: i + 1 })));
      if (optError) return { error: describeDbError(optError, "Could not save the options") };
    }
  } else {
    const error = await insertQuestion(supabase, quizId, q, await nextSortOrder("questions", "quiz_id", quizId));
    if (error) return { error };
  }

  revalidateTopic(topicId);
  return { ok: true };
}

/** Bulk import from the CSV template (FR-25). All rows must be valid, or nothing is imported. */
export async function importQuestionsCsv(formData: FormData) {
  const quizId = text(formData, "quizId");
  const topicId = text(formData, "topicId");
  if (!uuid.safeParse(quizId).success || !uuid.safeParse(topicId).success) redirect("/admin/content");
  const back = `/admin/content/topics/${topicId}#quiz`;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(withFlash(back, { error: "Choose a CSV file first." }));
  if (file.size > 1_000_000) redirect(withFlash(back, { error: "The file is too large (1 MB maximum)." }));

  const { questions, errors } = parseQuestionsCsv(await file.text());
  if (errors.length > 0) {
    const shown = errors.slice(0, 5).join(" ");
    const more = errors.length > 5 ? ` (+${errors.length - 5} more)` : "";
    redirect(withFlash(back, { error: `Nothing imported — fix the file and try again. ${shown}${more}` }));
  }
  if (questions.length === 0) redirect(withFlash(back, { error: "No questions found in the file." }));

  const supabase = await createClient();
  let sortOrder = await nextSortOrder("questions", "quiz_id", quizId);
  let done = 0;
  for (const q of questions) {
    const error = await insertQuestion(supabase, quizId, q, sortOrder++);
    if (error) {
      revalidateTopic(topicId);
      redirect(withFlash(back, { error: `Imported ${done} of ${questions.length}, then failed: ${error}` }));
    }
    done += 1;
  }

  revalidateTopic(topicId);
  redirect(withFlash(back, { ok: `Imported ${done} ${done === 1 ? "question" : "questions"}.` }));
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
