import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button, Card, Field, Input, Select, Textarea, buttonClasses } from "@/components/ui";
import { STATUS_LABELS, getSubjectAdmin } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { ConfirmButton } from "../../../_components/confirm-button";
import { Flash } from "../../../_components/flash";
import { StatusBadge } from "../../../_components/status-badge";
import { createTopic, deleteSubject, moveTopic, updateSubject } from "../../actions";

type Params = Promise<{ subjectId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { subjectId } = await params;
  const data = await getSubjectAdmin(subjectId);
  return { title: data?.subject.name ?? "Subject" };
}

export default async function SubjectAdminPage({ params, searchParams }: { params: Params; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [user, { subjectId }, flash] = await Promise.all([requireStaff(), params, searchParams]);
  const data = await getSubjectAdmin(subjectId);
  if (!data) notFound();
  const { subject, level, topics } = data;
  const isAdmin = user.profile.role === "admin";

  return (
    <>
      <Breadcrumbs items={[{ href: "/admin/content", label: "Content" }, { href: "/admin/content", label: level.name }, { label: subject.name }]} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">{subject.name}</h1>
        <Link href={`/learn/${level.number}/${subject.slug}`} className={buttonClasses("ghost", "sm")} target="_blank">
          View on site ↗
        </Link>
      </div>
      <div className="mt-5">
        <Flash {...flash} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-brand-900">Topics</h2>
              <span className="text-sm text-slate-500">{topics.length} total · in teaching order</span>
            </div>

            {topics.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No topics yet. Add the first one below.</p>
            ) : (
              <ol className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {topics.map((topic, i) => (
                  <li key={topic.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex flex-col">
                      <form action={moveTopic}>
                        <input type="hidden" name="id" value={topic.id} />
                        <input type="hidden" name="subjectId" value={subject.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button type="submit" disabled={i === 0} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" aria-label={`Move ${topic.title} up`}>
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </form>
                      <form action={moveTopic}>
                        <input type="hidden" name="id" value={topic.id} />
                        <input type="hidden" name="subjectId" value={subject.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button type="submit" disabled={i === topics.length - 1} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" aria-label={`Move ${topic.title} down`}>
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </form>
                    </div>
                    <span className="w-6 text-sm text-slate-400">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/content/topics/${topic.id}`} className="font-medium text-brand-900 hover:text-brand-700 hover:underline">
                        {topic.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {topic.quiz ? `Quiz: ${STATUS_LABELS[topic.quiz.status].toLowerCase()}` : "No quiz yet"}
                      </p>
                    </div>
                    <StatusBadge status={topic.status} />
                    <Link href={`/admin/content/topics/${topic.id}`} className={buttonClasses("secondary", "sm")}>
                      Edit
                    </Link>
                  </li>
                ))}
              </ol>
            )}

            <form action={createTopic} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="subjectId" value={subject.id} />
              <Input name="title" placeholder="New topic title, e.g. Net Present Value" aria-label="New topic title" required minLength={2} className="flex-1" />
              <Button type="submit" variant="primary">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add topic
              </Button>
            </form>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-lg font-bold text-brand-900">Subject details</h2>
            {isAdmin ? (
              <form action={updateSubject} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={subject.id} />
                <Field label="Name" htmlFor="name">
                  <Input id="name" name="name" defaultValue={subject.name} required minLength={2} />
                </Field>
                <Field label="Slug (web address)" htmlFor="slug" hint={`/learn/${level.number}/…`}>
                  <Input id="slug" name="slug" defaultValue={subject.slug} />
                </Field>
                <Field label="Short description" htmlFor="description">
                  <Textarea id="description" name="description" defaultValue={subject.description} className="min-h-20" />
                </Field>
                <Field label="Status" htmlFor="status" hint="Students only see published subjects">
                  <Select id="status" name="status" defaultValue={subject.status}>
                    {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit">Save subject</Button>
              </form>
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <StatusBadge status={subject.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Description</dt>
                  <dd className="text-slate-700">{subject.description || "—"}</dd>
                </div>
                <p className="text-xs text-slate-500">Only admins change subject details.</p>
              </dl>
            )}
          </Card>

          {isAdmin && (
            <Card className="border-red-200">
              <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
              <p className="mt-1 text-sm text-slate-600">Deleting a subject removes all its topics, materials, quizzes and student progress.</p>
              <form action={deleteSubject} className="mt-3">
                <input type="hidden" name="id" value={subject.id} />
                <ConfirmButton variant="danger" size="sm" message={`Delete "${subject.name}" and all ${topics.length} topics? This cannot be undone.`}>
                  <Trash className="h-4 w-4" aria-hidden="true" />
                  Delete subject
                </ConfirmButton>
              </form>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
