import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { Button, Input, PageHeader, buttonClasses } from "@/components/ui";
import { getContentTree } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { Flash } from "../_components/flash";
import { StatusBadge } from "../_components/status-badge";
import { createSubject, moveSubject } from "./actions";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [user, tree, flash] = await Promise.all([requireStaff(), getContentTree(), searchParams]);
  const isAdmin = user.profile.role === "admin";

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Levels and subjects"
        description={isAdmin ? "Each level holds its subjects; each subject holds topics in teaching order." : "The subjects you can edit."}
      />
      <div className="mt-6">
        <Flash {...flash} />
      </div>

      <div className="space-y-6">
        {tree.map((level) => (
          <section key={level.id} className="rounded-card border border-slate-200 bg-white shadow-card">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-brand-900">{level.name}</h2>
                <p className="text-sm text-slate-500">{level.study_year}</p>
              </div>
              <span className="text-sm text-slate-500">
                {level.subjects.length} {level.subjects.length === 1 ? "subject" : "subjects"}
              </span>
            </header>

            {level.subjects.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">{isAdmin ? "No subjects yet." : "None of your subjects are in this level."}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {level.subjects.map((subject, i) => (
                  <li key={subject.id} className="flex items-center gap-3 px-5 py-3">
                    {isAdmin && (
                      <div className="flex flex-col">
                        <form action={moveSubject}>
                          <input type="hidden" name="id" value={subject.id} />
                          <input type="hidden" name="levelId" value={level.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button type="submit" disabled={i === 0} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" aria-label={`Move ${subject.name} up`}>
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </form>
                        <form action={moveSubject}>
                          <input type="hidden" name="id" value={subject.id} />
                          <input type="hidden" name="levelId" value={level.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button type="submit" disabled={i === level.subjects.length - 1} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" aria-label={`Move ${subject.name} down`}>
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </form>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/content/subjects/${subject.id}`} className="font-semibold text-brand-900 hover:text-brand-700 hover:underline">
                        {subject.name}
                      </Link>
                      <p className="truncate text-sm text-slate-500">{subject.description || "No description yet"}</p>
                    </div>
                    <span className="hidden text-sm text-slate-500 sm:block">
                      {subject.topicCount} {subject.topicCount === 1 ? "topic" : "topics"}
                    </span>
                    <StatusBadge status={subject.status} />
                    <Link href={`/admin/content/subjects/${subject.id}`} className={buttonClasses("secondary", "sm")}>
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {isAdmin && (
              <form action={createSubject} className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row">
                <input type="hidden" name="levelId" value={level.id} />
                <Input name="name" placeholder="New subject name" aria-label={`New subject in ${level.name}`} required minLength={2} className="sm:max-w-xs" />
                <Input name="description" placeholder="Short description (optional)" aria-label="Description" className="flex-1" />
                <Button type="submit" variant="secondary" size="md">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add subject
                </Button>
              </form>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
