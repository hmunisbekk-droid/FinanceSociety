import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, FileText, Image as ImageIcon, Link as LinkIcon, Pencil, Plus, Presentation, StickyNote, Trash, Upload, Video } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button, Card, Field, Input, Select, Textarea, buttonClasses } from "@/components/ui";
import { STATUS_LABELS, getTopicAdmin } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { formatFileSize } from "@/lib/format";
import type { ContentStatus, MaterialType } from "@/lib/types";
import { ConfirmButton } from "../../../_components/confirm-button";
import { Flash } from "../../../_components/flash";
import { StatusBadge } from "../../../_components/status-badge";
import { deleteTopic, updateTopic } from "../../actions";
import { addLinkMaterial, createQuiz, deleteMaterial, deleteQuestion, importQuestionsCsv, moveMaterial, moveQuestion, updateMaterial, updateQuiz } from "../actions";
import { MaterialUpload } from "./material-upload";
import { QuestionEditor } from "./question-editor";

type Params = Promise<{ topicId: string }>;
type Search = Promise<{ ok?: string; error?: string; q?: string }>;

const MATERIAL_ICONS: Record<MaterialType, typeof FileText> = {
  pdf: FileText,
  slides: Presentation,
  image: ImageIcon,
  video: Video,
  link: LinkIcon,
  notes: StickyNote,
};

const QUESTION_TYPE_LABELS = { single: "Single choice", multiple: "Multiple choice", true_false: "True / false", numeric: "Numeric" } as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { topicId } = await params;
  const data = await getTopicAdmin(topicId);
  return { title: data?.topic.title ?? "Topic" };
}

function StatusOptions({ current, isAdmin }: { current: ContentStatus; isAdmin: boolean }) {
  const statuses = (Object.keys(STATUS_LABELS) as ContentStatus[]).filter((s) => isAdmin || s !== "published" || s === current);
  return (
    <>
      {statuses.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </>
  );
}

export default async function TopicAdminPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [user, { topicId }, search] = await Promise.all([requireStaff(), params, searchParams]);
  const data = await getTopicAdmin(topicId);
  if (!data) notFound();
  const { topic, subject, level, materials, quiz, publicPath } = data;
  const isAdmin = user.profile.role === "admin";
  const editingQuestion = search.q === "new" ? null : (quiz?.questions.find((q) => q.id === search.q) ?? null);
  const showEditor = quiz && (search.q === "new" || editingQuestion !== null);

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/admin/content", label: "Content" },
          { href: "/admin/content", label: level.name },
          { href: `/admin/content/subjects/${subject.id}`, label: subject.name },
          { label: topic.title },
        ]}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">{topic.title}</h1>
          <StatusBadge status={topic.status} />
        </div>
        <Link href={publicPath} className={buttonClasses("ghost", "sm")} target="_blank">
          View on site ↗
        </Link>
      </div>
      <div className="mt-5">
        <Flash {...search} />
      </div>

      {/* 1. Topic text (FR-11, §6.2) */}
      <Card>
        <h2 className="text-lg font-bold text-brand-900">Topic content</h2>
        <form action={updateTopic} className="mt-4 space-y-4">
          <input type="hidden" name="id" value={topic.id} />
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_200px]">
            <Field label="Title" htmlFor="title">
              <Input id="title" name="title" defaultValue={topic.title} required minLength={2} />
            </Field>
            <Field label="Slug (web address)" htmlFor="slug">
              <Input id="slug" name="slug" defaultValue={topic.slug} />
            </Field>
            <Field label="Status" htmlFor="status" hint={isAdmin ? undefined : "Admins publish after review"}>
              <Select id="status" name="status" defaultValue={topic.status}>
                <StatusOptions current={topic.status} isAdmin={isAdmin} />
              </Select>
            </Field>
          </div>
          <Field label="Summary" htmlFor="summary" hint="150–300 words in plain English. Blank lines start new paragraphs.">
            <Textarea id="summary" name="summary" defaultValue={topic.summary} className="min-h-40" />
          </Field>
          <Field label="Key formulas" htmlFor="key_formulas" hint="One formula per line, followed by what each symbol means.">
            <Textarea id="key_formulas" name="key_formulas" defaultValue={topic.key_formulas} className="min-h-28 font-mono text-sm" />
          </Field>
          <Field label="Worked example" htmlFor="worked_example" hint="One solved numeric problem, step by step.">
            <Textarea id="worked_example" name="worked_example" defaultValue={topic.worked_example} className="min-h-40" />
          </Field>
          <Button type="submit">Save topic</Button>
        </form>
      </Card>

      {/* 2. Materials (FR-15 … FR-18) */}
      <Card className="mt-6" id="materials">
        <h2 className="text-lg font-bold text-brand-900">Materials</h2>
        {materials.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No materials yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {materials.map((m, i) => {
              const Icon = MATERIAL_ICONS[m.type];
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="flex flex-col">
                    <form action={moveMaterial}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="topicId" value={topic.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" disabled={i === 0} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" aria-label="Move up">
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </form>
                    <form action={moveMaterial}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="topicId" value={topic.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" disabled={i === materials.length - 1} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" aria-label="Move down">
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </form>
                  </div>
                  <Icon className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{m.title}</p>
                    <p className="text-xs text-slate-500">
                      {m.type}
                      {m.file_size ? ` · ${formatFileSize(m.file_size)}` : ""}
                      {m.external_url ? ` · ${m.external_url}` : ""}
                    </p>
                  </div>
                  <form action={updateMaterial} className="flex items-center gap-3 text-sm">
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="topicId" value={topic.id} />
                    {m.storage_path && (
                      <label className="flex items-center gap-1.5 text-slate-600">
                        <input type="checkbox" name="allow_download" defaultChecked={m.allow_download} className="h-4 w-4 accent-brand-700" />
                        Download
                      </label>
                    )}
                    <label className="flex items-center gap-1.5 text-slate-600">
                      <input type="checkbox" name="status" value="draft" defaultChecked={m.status !== "published"} className="h-4 w-4 accent-brand-700" />
                      Hidden
                    </label>
                    <Button type="submit" variant="ghost" size="sm">
                      Save
                    </Button>
                  </form>
                  <form action={deleteMaterial}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="topicId" value={topic.id} />
                    <ConfirmButton variant="ghost" size="sm" className="text-red-600" message={`Remove "${m.title}"?`} aria-label={`Remove ${m.title}`}>
                      <Trash className="h-4 w-4" aria-hidden="true" />
                    </ConfirmButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Upload a file</h3>
            <div className="mt-3">
              <MaterialUpload topicId={topic.id} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Add a link, video or notes</h3>
            <form action={addLinkMaterial} className="mt-3 space-y-3">
              <input type="hidden" name="topicId" value={topic.id} />
              <Field label="Type" htmlFor="link-type">
                <Select id="link-type" name="type" defaultValue="video">
                  <option value="video">Video link (YouTube or other)</option>
                  <option value="link">External link</option>
                  <option value="notes">Text notes</option>
                </Select>
              </Field>
              <Field label="Title" htmlFor="link-title">
                <Input id="link-title" name="title" required placeholder="e.g. NPV explained in 7 minutes" />
              </Field>
              <Field label="Link (for video / external link)" htmlFor="link-url">
                <Input id="link-url" name="url" type="url" placeholder="https://…" />
              </Field>
              <Field label="Notes text (for text notes)" htmlFor="link-body">
                <Textarea id="link-body" name="body" className="min-h-20" />
              </Field>
              <Button type="submit" variant="secondary">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </form>
          </div>
        </div>
      </Card>

      {/* 3. Quiz (FR-19 … FR-23) */}
      <Card className="mt-6" id="quiz">
        <h2 className="text-lg font-bold text-brand-900">Quiz</h2>
        {!quiz ? (
          <form action={createQuiz} className="mt-3">
            <input type="hidden" name="topicId" value={topic.id} />
            <p className="text-sm text-slate-600">This topic has no quiz yet. Each topic has one quiz of 5–10 questions.</p>
            <Button type="submit" className="mt-3">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create quiz
            </Button>
          </form>
        ) : (
          <>
            <form action={updateQuiz} className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:flex-wrap sm:items-end">
              <input type="hidden" name="id" value={quiz.id} />
              <input type="hidden" name="topicId" value={topic.id} />
              <div className="flex-1">
                <Field label="Quiz title" htmlFor="quiz-title">
                  <Input id="quiz-title" name="title" defaultValue={quiz.title} required />
                </Field>
              </div>
              <div className="w-full sm:w-48">
                <Field label="Status" htmlFor="quiz-status">
                  <Select id="quiz-status" name="status" defaultValue={quiz.status}>
                    <StatusOptions current={quiz.status} isAdmin={isAdmin} />
                  </Select>
                </Field>
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                <input type="checkbox" name="shuffle_questions" defaultChecked={quiz.shuffle_questions} className="h-4 w-4 accent-brand-700" />
                Shuffle questions
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                <input type="checkbox" name="shuffle_options" defaultChecked={quiz.shuffle_options} className="h-4 w-4 accent-brand-700" />
                Shuffle options
              </label>
              <Button type="submit" variant="secondary">
                Save settings
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Questions <span className="font-normal text-slate-500">({quiz.questions.length})</span>
              </h3>
              {!showEditor && (
                <Link href={`/admin/content/topics/${topic.id}?q=new#quiz`} className={buttonClasses("primary", "sm")}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add question
                </Link>
              )}
            </div>

            {quiz.questions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No questions yet.</p>
            ) : (
              <ol className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {quiz.questions.map((q, i) => (
                  <li key={q.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex flex-col">
                      <form action={moveQuestion}>
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="quizId" value={quiz.id} />
                        <input type="hidden" name="topicId" value={topic.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button type="submit" disabled={i === 0} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" aria-label="Move up">
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </form>
                      <form action={moveQuestion}>
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="quizId" value={quiz.id} />
                        <input type="hidden" name="topicId" value={topic.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button type="submit" disabled={i === quiz.questions.length - 1} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" aria-label="Move down">
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </form>
                    </div>
                    <span className="w-6 text-sm text-slate-400">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{q.prompt}</p>
                      <p className="text-xs text-slate-500">
                        {QUESTION_TYPE_LABELS[q.type]} · {q.points} {Number(q.points) === 1 ? "point" : "points"}
                        {q.type === "numeric" ? ` · answer ${q.numeric_answer}${q.tolerance ? ` ±${q.tolerance}${q.tolerance_type === "percent" ? "%" : ""}` : ""}` : ` · ${q.question_options.length} options`}
                      </p>
                    </div>
                    <Link href={`/admin/content/topics/${topic.id}?q=${q.id}#quiz`} className={buttonClasses("secondary", "sm")}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Link>
                    <form action={deleteQuestion}>
                      <input type="hidden" name="id" value={q.id} />
                      <input type="hidden" name="topicId" value={topic.id} />
                      <ConfirmButton variant="ghost" size="sm" className="text-red-600" message="Delete this question?" aria-label="Delete question">
                        <Trash className="h-4 w-4" aria-hidden="true" />
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ol>
            )}

            {showEditor && (
              <div className="mt-5">
                <QuestionEditor key={editingQuestion?.id ?? "new"} quizId={quiz.id} topicId={topic.id} initial={editingQuestion} />
              </div>
            )}

            {/* Bulk import (FR-25) */}
            <details className="mt-5 rounded-lg border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">Import questions from a CSV file</summary>
              <p className="mt-2 text-sm text-slate-600">
                Download the{" "}
                <a href="/questions-template.csv" download className="font-medium text-brand-700 underline">
                  template
                </a>
                , fill it in Excel or Google Sheets, save as CSV (UTF-8) and upload it here. Imported questions are added after the existing ones.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Columns: type (single, multiple, true_false, numeric) · question · points · option_a … option_e · correct (A, or A;C for several, or TRUE/FALSE) ·
                numeric_answer · tolerance · tolerance_type (absolute/percent) · explanation.
              </p>
              <form action={importQuestionsCsv} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input type="hidden" name="quizId" value={quiz.id} />
                <input type="hidden" name="topicId" value={topic.id} />
                <input
                  type="file"
                  name="file"
                  accept=".csv,text/csv"
                  required
                  aria-label="CSV file"
                  className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-800 hover:file:bg-brand-100 sm:w-auto"
                />
                <Button type="submit" variant="secondary">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Import
                </Button>
              </form>
            </details>
          </>
        )}
      </Card>

      {/* 4. Danger zone */}
      <Card className="mt-6 border-red-200">
        <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-slate-600">Deleting the topic removes its materials, quiz and all students&apos; progress on it.</p>
        <form action={deleteTopic} className="mt-3">
          <input type="hidden" name="id" value={topic.id} />
          <input type="hidden" name="subjectId" value={subject.id} />
          <ConfirmButton variant="danger" size="sm" message={`Delete "${topic.title}"? This cannot be undone.`}>
            <Trash className="h-4 w-4" aria-hidden="true" />
            Delete topic
          </ConfirmButton>
        </form>
      </Card>
    </>
  );
}
