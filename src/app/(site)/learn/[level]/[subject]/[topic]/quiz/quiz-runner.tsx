"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, RotateCcw, Trophy, X } from "lucide-react";
import { Alert, Button, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import type { PublicQuestion, QuestionResult, StudentAnswer } from "@/lib/quiz";
import { submitQuiz, type SubmitQuizResult } from "../../../../actions";

type Result = Exclude<SubmitQuizResult, { error: string }>;

const EMPTY: StudentAnswer = { optionIds: [], value: "" };

export function QuizRunner({
  quizId,
  questions,
  topicHref,
  previousBest,
}: {
  quizId: string;
  questions: PublicQuestion[];
  topicHref: string;
  previousBest: number | null;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const question = questions[index]!;
  const answer = answers[question.id] ?? EMPTY;
  const unanswered = questions.filter((q) => {
    const a = answers[q.id];
    return q.type === "numeric" ? !a?.value.trim() : !a?.optionIds.length;
  }).length;

  const setAnswer = (next: StudentAnswer) => setAnswers((prev) => ({ ...prev, [question.id]: next }));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await submitQuiz(quizId, answers);
      if ("error" in res) {
        setError(res.error);
      } else {
        setResult(res);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const tryAgain = () => {
    setResult(null);
    setAnswers({});
    setIndex(0);
    setError(null);
    router.refresh(); // re-shuffles questions on the server
  };

  if (result) {
    return <Results result={result} questions={questions} topicHref={topicHref} onRetry={tryAgain} />;
  }

  const isLast = index === questions.length - 1;
  const progress = Math.round(((index + 1) / questions.length) * 100);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        {previousBest !== null && <span>Your best: {formatPercent(previousBest)}</span>}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Quiz progress">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-6 rounded-card border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {question.type === "multiple"
            ? "Choose all that apply"
            : question.type === "numeric"
              ? "Enter a number"
              : question.type === "true_false"
                ? "True or false"
                : "Choose one answer"}
          {question.points !== 1 && ` · ${question.points} points`}
        </p>
        <h2 className="mt-2 text-xl font-semibold leading-snug text-brand-900">{question.prompt}</h2>

        <div className="mt-5">
          {question.type === "numeric" ? (
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-label="Your answer"
              placeholder="e.g. 1250.75"
              value={answer.value}
              onChange={(e) => setAnswer({ optionIds: [], value: e.target.value })}
              className="block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2.5 text-lg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          ) : (
            <fieldset>
              <legend className="sr-only">Answer options</legend>
              <div className="space-y-2">
                {question.options.map((option) => {
                  const multiple = question.type === "multiple";
                  const checked = answer.optionIds.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors",
                        checked ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300 hover:bg-slate-50",
                      )}
                    >
                      <input
                        type={multiple ? "checkbox" : "radio"}
                        name={`q-${question.id}`}
                        value={option.id}
                        checked={checked}
                        onChange={() => {
                          if (multiple) {
                            setAnswer({
                              value: "",
                              optionIds: checked ? answer.optionIds.filter((id) => id !== option.id) : [...answer.optionIds, option.id],
                            });
                          } else {
                            setAnswer({ value: "", optionIds: [option.id] });
                          }
                        }}
                        className="mt-1 h-4 w-4 accent-brand-700"
                      />
                      <span className="text-base text-slate-800">{option.text}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>
      </div>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0 || pending}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isLast && unanswered > 0 && (
            <span className="text-sm text-slate-500">
              {unanswered} unanswered {unanswered === 1 ? "question" : "questions"}
            </span>
          )}
          {isLast ? (
            <Button onClick={submit} disabled={pending} size="lg">
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              {pending ? "Marking…" : "Submit answers"}
            </Button>
          ) : (
            <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))} size="lg">
              Next
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <ol className="mt-6 flex flex-wrap gap-1.5" aria-label="Jump to question">
        {questions.map((q, i) => {
          const a = answers[q.id];
          const done = q.type === "numeric" ? !!a?.value.trim() : !!a?.optionIds.length;
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "h-8 w-8 rounded-md text-sm font-medium",
                  i === index ? "bg-brand-800 text-white" : done ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-500",
                )}
              >
                {i + 1}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Results({
  result,
  questions,
  topicHref,
  onRetry,
}: {
  result: Result;
  questions: PublicQuestion[];
  topicHref: string;
  onRetry: () => void;
}) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const correctCount = result.questions.filter((q) => q.correct).length;
  const pct = Math.round(result.percent);
  const tone = pct >= 70 ? "text-green-700" : pct >= 40 ? "text-accent-600" : "text-red-700";

  return (
    <div className="mt-6">
      <div className="rounded-card border border-slate-200 bg-white p-6 text-center shadow-card sm:p-8">
        <Trophy className={cn("mx-auto h-10 w-10", tone)} aria-hidden="true" />
        <p className={cn("mt-3 text-5xl font-bold", tone)}>{pct}%</p>
        <p className="mt-2 text-slate-700">
          {correctCount} of {result.questions.length} correct · {result.score} of {result.maxScore} points
        </p>
        <p className="mt-1 text-sm text-slate-500">Best score so far: {formatPercent(result.bestPercent)}</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={onRetry} variant="secondary">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Link href={topicHref} className={buttonClasses("primary")}>
            Back to the topic
          </Link>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-bold text-brand-900">Review your answers</h2>
      <ol className="mt-4 space-y-4">
        {result.questions.map((r, i) => {
          const q = byId.get(r.id);
          if (!q) return null;
          return <ReviewItem key={r.id} index={i} question={q} result={r} />;
        })}
      </ol>
    </div>
  );
}

function ReviewItem({ index, question, result }: { index: number; question: PublicQuestion; result: QuestionResult }) {
  const toleranceText =
    result.tolerance !== null && result.toleranceType
      ? ` (±${result.tolerance}${result.toleranceType === "percent" ? "%" : ""})`
      : "";

  return (
    <li className={cn("rounded-card border bg-white p-5 shadow-card", result.correct ? "border-green-200" : "border-red-200")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            result.correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
          )}
          aria-hidden="true"
        >
          {result.correct ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">
            Question {index + 1} · {result.correct ? "Correct" : result.answered ? "Incorrect" : "Not answered"}
            {result.points !== 1 && ` · ${result.pointsEarned}/${result.points} points`}
          </p>
          <p className="mt-1 font-semibold text-brand-900">{question.prompt}</p>

          {question.type === "numeric" ? (
            <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Your answer</dt>
                <dd className={cn("font-medium", result.correct ? "text-green-700" : "text-red-700")}>{result.yourValue || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Correct answer</dt>
                <dd className="font-medium text-green-700">
                  {result.correctValue}
                  {toleranceText}
                </dd>
              </div>
            </dl>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {question.options.map((o) => {
                const chosen = result.yourOptionIds.includes(o.id);
                const isCorrect = result.correctOptionIds.includes(o.id);
                return (
                  <li
                    key={o.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-1.5",
                      isCorrect ? "bg-green-50 text-green-800" : chosen ? "bg-red-50 text-red-800" : "text-slate-600",
                    )}
                  >
                    {isCorrect ? (
                      <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : chosen ? (
                      <X className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <span className="inline-block h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                    <span>{o.text}</span>
                    {chosen && <span className="ml-auto text-xs text-slate-500">your answer</span>}
                  </li>
                );
              })}
            </ul>
          )}

          {result.explanation && (
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-semibold text-slate-800">Worked solution</p>
              <p className="mt-1 whitespace-pre-line">{result.explanation}</p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
