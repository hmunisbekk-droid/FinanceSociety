import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge, ButtonLink, Container, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getLevelPage } from "@/lib/learning";

function parseLevel(value: string) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 3 && n <= 6 ? n : null;
}

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }): Promise<Metadata> {
  const { level } = await params;
  return { title: `Level ${level}` };
}

export default async function LevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: levelParam } = await params;
  const levelNumber = parseLevel(levelParam);
  if (!levelNumber) notFound();

  const user = await getCurrentUser();
  const page = await getLevelPage(levelNumber, user?.id);
  if (!page) notFound();
  const { level, subjects } = page;

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ href: "/learn", label: "Learning Hub" }, { label: level.name }]} />
      <div className="mt-4">
        <PageHeader
          eyebrow={level.study_year}
          title={level.name}
          description={level.description}
          actions={
            user?.profile.level_id === level.id ? <Badge tone="accent" className="h-7 px-3 text-sm">Your level</Badge> : undefined
          }
        />
      </div>

      {!user && (
        <div className="mt-8 flex flex-col gap-3 rounded-card border border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-brand-900">
            <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
            Log in to open topics, materials and quizzes. Browsing the subject list is free.
          </p>
          <div className="flex gap-2">
            <ButtonLink href={`/login?next=/learn/${level.number}`} variant="secondary" size="sm">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup" size="sm">
              Join
            </ButtonLink>
          </div>
        </div>
      )}

      {subjects.length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No subjects have been published for this level yet.
        </p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => {
            const pct = subject.topicCount > 0 ? Math.round((subject.completedCount / subject.topicCount) * 100) : 0;
            return (
              <li key={subject.id}>
                <Link
                  href={`/learn/${level.number}/${subject.slug}`}
                  className="group flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-brand-900 group-hover:text-brand-700">{subject.name}</h2>
                    {subject.status !== "published" && <Badge tone="neutral">{subject.status}</Badge>}
                  </div>
                  <p className="mt-2 flex-1 text-sm text-slate-600">{subject.description}</p>

                  {user ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          {subject.topicCount} {subject.topicCount === 1 ? "topic" : "topics"}
                        </span>
                        {subject.topicCount > 0 && (
                          <span className="font-medium text-slate-700">
                            {subject.completedCount}/{subject.topicCount} done
                          </span>
                        )}
                      </div>
                      {subject.topicCount > 0 && (
                        <div
                          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                          aria-label={`${subject.name} progress`}
                        >
                          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Log in to see topics</span>
                      <span className="inline-flex items-center gap-1 font-medium text-brand-700">
                        Open <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
