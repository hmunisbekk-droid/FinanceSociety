"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { grade, loadFullQuestions, type GradedQuiz, type StudentAnswer } from "@/lib/quiz";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

/** Records that the student opened a topic (FR-27, FR-38). Called from the topic page. */
export async function recordTopicView(topicId: string) {
  if (!uuid.safeParse(topicId).success) return;
  const user = await getCurrentUser();
  if (!user || user.profile.is_blocked) return;

  const supabase = await createClient();
  await Promise.all([
    supabase.from("topic_views").insert({ topic_id: topicId, user_id: user.id }),
    supabase
      .from("topic_progress")
      .upsert({ user_id: user.id, topic_id: topicId, last_opened_at: new Date().toISOString() }, { onConflict: "user_id,topic_id" }),
  ]);
}

/** Student marks a topic as completed, or un-marks it (FR-12). */
export async function setTopicCompleted(formData: FormData) {
  const topicId = String(formData.get("topicId") ?? "");
  const completed = formData.get("completed") === "true";
  const path = String(formData.get("path") ?? "/learn");
  if (!uuid.safeParse(topicId).success) return;

  const user = await getCurrentUser();
  if (!user || user.profile.is_blocked) return;

  const supabase = await createClient();
  await supabase.from("topic_progress").upsert(
    {
      user_id: user.id,
      topic_id: topicId,
      completed_at: completed ? new Date().toISOString() : null,
      last_opened_at: new Date().toISOString(),
    },
    { onConflict: "user_id,topic_id" },
  );

  revalidatePath(path);
  revalidatePath("/learn", "layout");
  revalidatePath("/my");
}

export type SubmitQuizResult = (GradedQuiz & { attemptId: string; bestPercent: number }) | { error: string };

const topicPathPattern = /^\/learn\/[3-6]\/[a-z0-9-]+\/[a-z0-9-]+$/;

/** Grades an attempt on the server and stores it (FR-22). */
export async function submitQuiz(
  quizId: string,
  answers: Record<string, StudentAnswer>,
  topicPath: string,
): Promise<SubmitQuizResult> {
  if (!uuid.safeParse(quizId).success) return { error: "Quiz not found." };

  const user = await getCurrentUser();
  if (!user || user.profile.is_blocked) return { error: "Please log in to submit a quiz." };

  // Row security decides whether this student may see the quiz at all.
  const supabase = await createClient();
  const { data: quiz } = await supabase.from("quizzes").select("id, status").eq("id", quizId).maybeSingle();
  if (!quiz) return { error: "This quiz is not available." };

  const questions = await loadFullQuestions(quizId);
  if (questions.length === 0) return { error: "This quiz has no questions yet." };

  const cleaned: Record<string, StudentAnswer> = {};
  for (const q of questions) {
    const a = answers[q.id];
    cleaned[q.id] = {
      optionIds: Array.isArray(a?.optionIds) ? a.optionIds.filter((id) => typeof id === "string").slice(0, 20) : [],
      value: typeof a?.value === "string" ? a.value.slice(0, 50) : "",
    };
  }

  const graded = grade(questions, cleaned);

  const admin = createAdminClient();
  const { data: attempt, error } = await admin
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: user.id,
      score: graded.score,
      max_score: graded.maxScore,
      percent: Math.round(graded.percent * 100) / 100,
      answers: graded.questions.map((q) => ({
        question_id: q.id,
        option_ids: q.yourOptionIds,
        value: q.yourValue,
        correct: q.correct,
      })),
    })
    .select("id")
    .single();
  if (error || !attempt) return { error: "Could not save your attempt. Please try again." };

  const { data: best } = await admin
    .from("quiz_attempts")
    .select("percent")
    .eq("user_id", user.id)
    .eq("quiz_id", quizId)
    .order("percent", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Refresh the pages that show scores, but not the quiz page itself (it would reshuffle under the results).
  if (topicPathPattern.test(topicPath)) {
    revalidatePath(topicPath);
    revalidatePath(topicPath.slice(0, topicPath.lastIndexOf("/")));
  }
  revalidatePath("/my");

  return { ...graded, attemptId: attempt.id as string, bestPercent: Number(best?.percent ?? graded.percent) };
}
