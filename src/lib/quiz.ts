import "server-only";

import { renderMath } from "@/lib/math";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Question, QuestionOption, QuestionType } from "@/lib/types";

/** What the student's browser receives: no answers, no explanations. */
export interface PublicQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  /** Prompt with formulas rendered (FR-13). */
  promptHtml: string;
  points: number;
  options: Array<{ id: string; text: string; html: string }>;
}

export interface StudentAnswer {
  optionIds: string[];
  value: string;
}

export interface QuestionResult {
  id: string;
  correct: boolean;
  answered: boolean;
  explanation: string;
  explanationHtml: string;
  correctOptionIds: string[];
  correctValue: number | null;
  tolerance: number | null;
  toleranceType: "absolute" | "percent" | null;
  yourValue: string;
  yourOptionIds: string[];
  pointsEarned: number;
  points: number;
}

export interface GradedQuiz {
  score: number;
  maxScore: number;
  percent: number;
  questions: QuestionResult[];
}

type FullQuestion = Question & { question_options: QuestionOption[] };

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Loads a quiz's questions with the service role; answers never leave the server. */
export async function loadFullQuestions(quizId: string): Promise<FullQuestion[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("*, question_options(*)")
    .eq("quiz_id", quizId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return ((data ?? []) as FullQuestion[]).map((q) => ({
    ...q,
    question_options: [...(q.question_options ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
}

/** Strips answers and (optionally) shuffles for a new attempt (FR-23). */
export function toPublicQuestions(
  questions: FullQuestion[],
  { shuffleQuestions, shuffleOptions }: { shuffleQuestions: boolean; shuffleOptions: boolean },
): PublicQuestion[] {
  const list = shuffleQuestions ? shuffle(questions) : questions;
  return list.map((q) => {
    const options = q.question_options.map((o) => ({ id: o.id, text: o.text, html: renderMath(o.text) }));
    return {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      promptHtml: renderMath(q.prompt),
      points: Number(q.points),
      // True/false keeps its natural order so "True" is always first.
      options: shuffleOptions && q.type !== "true_false" ? shuffle(options) : options,
    };
  });
}

export function parseNumeric(value: string): number | null {
  const cleaned = value.trim().replace(/\s+/g, "").replace(/%$/, "");
  if (cleaned === "") return null;
  // Accept a decimal comma when there is no decimal point.
  const normalised = cleaned.includes(".") ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
}

/** Numeric answers accept a tolerance per question (FR-20). */
export function numericMatches(
  given: number,
  expected: number,
  tolerance: number | null,
  toleranceType: "absolute" | "percent" | null,
) {
  if (tolerance === null || tolerance === undefined || toleranceType === null) {
    return Math.abs(given - expected) <= 1e-9;
  }
  const allowed = toleranceType === "percent" ? Math.abs(expected) * (tolerance / 100) : tolerance;
  return Math.abs(given - expected) <= allowed + 1e-9;
}

export function grade(questions: FullQuestion[], answers: Record<string, StudentAnswer | undefined>): GradedQuiz {
  let score = 0;
  let maxScore = 0;

  const results: QuestionResult[] = questions.map((q) => {
    const points = Number(q.points);
    maxScore += points;
    const answer = answers[q.id];
    const yourOptionIds = answer?.optionIds ?? [];
    const yourValue = answer?.value ?? "";
    const correctOptionIds = q.question_options.filter((o) => o.is_correct).map((o) => o.id);

    let correct = false;
    let answered = false;

    if (q.type === "numeric") {
      const given = parseNumeric(yourValue);
      answered = given !== null;
      correct =
        given !== null &&
        q.numeric_answer !== null &&
        numericMatches(given, Number(q.numeric_answer), q.tolerance === null ? null : Number(q.tolerance), q.tolerance_type);
    } else if (q.type === "multiple") {
      answered = yourOptionIds.length > 0;
      const chosen = new Set(yourOptionIds);
      correct =
        chosen.size === correctOptionIds.length && correctOptionIds.every((id) => chosen.has(id));
    } else {
      // single, true_false
      answered = yourOptionIds.length === 1;
      correct = answered && correctOptionIds.includes(yourOptionIds[0]!);
    }

    const pointsEarned = correct ? points : 0;
    score += pointsEarned;

    return {
      id: q.id,
      correct,
      answered,
      explanation: q.explanation,
      explanationHtml: renderMath(q.explanation),
      correctOptionIds,
      correctValue: q.numeric_answer === null ? null : Number(q.numeric_answer),
      tolerance: q.tolerance === null ? null : Number(q.tolerance),
      toleranceType: q.tolerance_type,
      yourValue,
      yourOptionIds,
      pointsEarned,
      points,
    };
  });

  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return { score, maxScore, percent, questions: results };
}
