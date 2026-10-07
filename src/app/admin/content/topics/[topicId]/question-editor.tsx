"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { QuestionWithOptions } from "@/lib/admin";
import type { QuestionType, ToleranceType } from "@/lib/types";
import { saveQuestion } from "../actions";

interface OptionDraft {
  text: string;
  correct: boolean;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  single: "Single choice",
  multiple: "Multiple choice (several correct)",
  true_false: "True / false",
  numeric: "Numeric answer",
};

const TRUE_FALSE: OptionDraft[] = [
  { text: "True", correct: true },
  { text: "False", correct: false },
];

export function QuestionEditor({ quizId, topicId, initial }: { quizId: string; topicId: string; initial: QuestionWithOptions | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<QuestionType>(initial?.type ?? "single");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [points, setPoints] = useState(String(initial?.points ?? 1));
  const [options, setOptions] = useState<OptionDraft[]>(
    initial && initial.type !== "numeric" && initial.question_options.length > 0
      ? initial.question_options.map((o) => ({ text: o.text, correct: o.is_correct }))
      : initial?.type === "true_false"
        ? TRUE_FALSE
        : [
            { text: "", correct: true },
            { text: "", correct: false },
            { text: "", correct: false },
          ],
  );
  const [numericAnswer, setNumericAnswer] = useState(initial?.numeric_answer === null || initial?.numeric_answer === undefined ? "" : String(initial.numeric_answer));
  const [tolerance, setTolerance] = useState(initial?.tolerance === null || initial?.tolerance === undefined ? "" : String(initial.tolerance));
  const [toleranceType, setToleranceType] = useState<ToleranceType>(initial?.tolerance_type ?? "absolute");

  const backHref = `/admin/content/topics/${topicId}#quiz`;

  function changeType(next: QuestionType) {
    setType(next);
    if (next === "true_false") setOptions(TRUE_FALSE.map((o) => ({ ...o })));
    else if (type === "true_false") setOptions([{ text: "", correct: true }, { text: "", correct: false }, { text: "", correct: false }]);
    else if (next === "single") setOptions((prev) => prev.map((o, i) => ({ ...o, correct: i === prev.findIndex((p) => p.correct) })));
  }

  function setCorrect(index: number, correct: boolean) {
    setOptions((prev) => prev.map((o, i) => (type === "multiple" ? (i === index ? { ...o, correct } : o) : { ...o, correct: i === index })));
  }

  function submit() {
    setError(null);
    const num = (value: string) => (value.trim() === "" ? null : Number(value.replace(",", ".")));
    startTransition(async () => {
      const result = await saveQuestion({
        id: initial?.id,
        quizId,
        topicId,
        type,
        prompt,
        explanation,
        points: Number(points) || 1,
        options: type === "numeric" ? [] : options,
        numericAnswer: num(numericAnswer),
        tolerance: num(tolerance),
        toleranceType: tolerance.trim() === "" ? null : toleranceType,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/admin/content/topics/${topicId}?ok=${encodeURIComponent("Question saved.")}#quiz`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-brand-200 bg-brand-50/40 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-brand-900">{initial ? "Edit question" : "New question"}</h3>
        <Button variant="ghost" size="sm" onClick={() => router.push(backHref)}>
          <X className="h-4 w-4" aria-hidden="true" />
          Cancel
        </Button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Type" htmlFor="q-type">
          <Select id="q-type" value={type} onChange={(e) => changeType(e.target.value as QuestionType)}>
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Points" htmlFor="q-points">
          <Input id="q-points" type="number" min={0.5} step={0.5} value={points} onChange={(e) => setPoints(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Question" htmlFor="q-prompt">
          <Textarea id="q-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-20" placeholder="e.g. A project costs 5,000 today and returns 6,050 in two years at 10%. What is the NPV?" />
        </Field>
      </div>

      {type === "numeric" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Correct answer" htmlFor="q-answer">
            <Input id="q-answer" inputMode="decimal" value={numericAnswer} onChange={(e) => setNumericAnswer(e.target.value)} placeholder="e.g. 0" />
          </Field>
          <Field label="Tolerance" htmlFor="q-tolerance" hint="Empty = exact match">
            <Input id="q-tolerance" inputMode="decimal" value={tolerance} onChange={(e) => setTolerance(e.target.value)} placeholder="e.g. 0.01" />
          </Field>
          <Field label="Tolerance type" htmlFor="q-tolerance-type">
            <Select id="q-tolerance-type" value={toleranceType} onChange={(e) => setToleranceType(e.target.value as ToleranceType)}>
              <option value="absolute">± absolute (e.g. ±0.01)</option>
              <option value="percent">± percent (e.g. ±1%)</option>
            </Select>
          </Field>
        </div>
      ) : (
        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-slate-700">
            Options · {type === "multiple" ? "tick every correct one" : "pick the correct one"}
          </legend>
          <ul className="mt-2 space-y-2">
            {options.map((option, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type={type === "multiple" ? "checkbox" : "radio"}
                  name="correct"
                  checked={option.correct}
                  onChange={(e) => setCorrect(i, e.target.checked)}
                  aria-label={`Option ${i + 1} is correct`}
                  className="h-4 w-4 accent-brand-700"
                />
                <Input
                  value={option.text}
                  readOnly={type === "true_false"}
                  onChange={(e) => setOptions((prev) => prev.map((o, j) => (j === i ? { ...o, text: e.target.value } : o)))}
                  placeholder={`Option ${i + 1}`}
                  aria-label={`Option ${i + 1} text`}
                />
                {type !== "true_false" && (
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                    disabled={options.length <= 2}
                    className="rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                    aria-label={`Remove option ${i + 1}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {type !== "true_false" && options.length < 10 && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setOptions((prev) => [...prev, { text: "", correct: false }])}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add option
            </Button>
          )}
        </fieldset>
      )}

      <div className="mt-4">
        <Field label="Worked solution / explanation" htmlFor="q-explanation" hint="Shown to the student after they submit (FR-21)">
          <Textarea id="q-explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} className="min-h-24" />
        </Field>
      </div>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-5 flex gap-2">
        <Button onClick={submit} disabled={pending}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {initial ? "Save question" : "Add question"}
        </Button>
        <Button variant="ghost" onClick={() => router.push(backHref)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
