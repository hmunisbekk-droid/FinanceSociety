import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Lock } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge, ButtonLink, Container, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { getSubjectPage } from "@/lib/learning";

type Params = Promise<{ level: string; subject: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { level, subject } = await params;
  const page = await getSubjectPage(Number(level), subject);
  return { title: page ? page.subject.name : "Subject" };
}

export default async function SubjectPage({ params }: { params: Params }) {
  const { level: levelParam, subject: subjectSlug } = await params;
  const levelNumber = Number(levelParam);
  if (!Number.isInteger(levelNumber)) notFound();

  const user = await getCurrentUser();
  const page = await getSubjectPage(levelNumber, subjectSlug, user?.id);
  if (!page) notFound();
  const { level, subject, topics } = page;

  const completed = topics.filter((t) => t.completed).length;
  const pct = topics.length > 0 ? Math.round((completed / topics.length) * 100) : 0;
  const base = `/learn/${level.number}/${subject.slug}`;

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { href: "/learn", label: "Learning Hub" },
          { href: `/learn/${level.number}`, label: level.name },
          { label: subject.name },
        ]}
      />
      <div className="mt-4">
        <PageHeader eyebrow={`${level.name} · ${level.study_year}`} title={subject.name} description={subject.description} />
      </div>

      {!user ? (
        <div className="mt-8 flex flex-col items-center rounded-card border border-brand-200 bg-brand-50 p-8 text-center">
          <Lock className="h-8 w-8 text-brand-700" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold text-brand-900">Log in to see the topics</h2>
          <p className="mt-1 max-w-md text-sm text-brand-900/80">
            Topics, materials and quizzes are available to registered students. It takes two minutes to join.
          </p>
          <div className="mt-5 flex gap-2">
            <ButtonLink href={`/login?next=${encodeURIComponent(base)}`} variant="secondary">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup">Join the society</ButtonLink>
          </div>
        </div>
      ) : topics.length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No topics have been published in this subject yet. Check back soon.
        </p>
      ) : (
        <>
          <div className="mt-8 rounded-card border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Your progress</span>
              <span className="text-slate-600">
                {completed} of {topics.length} topics completed · {pct}%
              </span>
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label="Subject progress"
            >
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <ol className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
            {topics.map((topic, i) => (
              <li key={topic.id}>
                <Link href={`${base}/${topic.slug}`} className="group flex items-center gap-4 p-4 hover:bg-slate-50 sm:px-5">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      topic.completed ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600",
                    )}
                    aria-hidden="true"
                  >
                    {topic.completed ? <Check className="h-5 w-5" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-brand-900 group-hover:text-brand-700">{topic.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-500">
                      {topic.completed ? "Completed" : topic.opened ? "In progress" : "Not started"}
                      {topic.status !== "published" && ` · ${topic.status}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {topic.quiz?.status === "published" &&
                      (topic.bestPercent !== null ? (
                        <Badge tone={topic.bestPercent >= 70 ? "success" : "neutral"}>Best {formatPercent(topic.bestPercent)}</Badge>
                      ) : (
                        <Badge tone="brand">Quiz</Badge>
                      ))}
                    <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </Container>
  );
}
