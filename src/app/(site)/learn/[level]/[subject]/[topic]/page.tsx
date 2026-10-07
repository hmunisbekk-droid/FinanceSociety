import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, ClipboardCheck, Lightbulb, Sigma } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MaterialItem } from "@/components/material-item";
import { Prose } from "@/components/prose";
import { Badge, ButtonLink, Container } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, formatPercent } from "@/lib/format";
import { getTopicPage, getTopicTitle } from "@/lib/learning";
import { CompletedToggle } from "./completed-toggle";
import { ViewPing } from "./view-ping";

type Params = Promise<{ level: string; subject: string; topic: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { level, subject, topic } = await params;
  const title = await getTopicTitle(Number(level), subject, topic);
  return { title: title ?? "Topic" };
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-brand-900">
        <Icon className="h-5 w-5 text-accent-600" aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function TopicPage({ params }: { params: Params }) {
  const { level: levelParam, subject: subjectSlug, topic: topicSlug } = await params;
  const levelNumber = Number(levelParam);
  if (!Number.isInteger(levelNumber)) notFound();

  const path = `/learn/${levelNumber}/${subjectSlug}/${topicSlug}`;
  const user = await requireUser(path);
  const page = await getTopicPage(levelNumber, subjectSlug, topicSlug, user.id);
  if (!page) notFound();
  const { level, subject, topic, materials, quiz, authorName, progress, bestPercent, attemptCount, previous, next, position } = page;

  const completed = progress?.completed_at !== null && progress?.completed_at !== undefined;
  const subjectHref = `/learn/${level.number}/${subject.slug}`;
  const quizAvailable = quiz?.status === "published";

  return (
    <Container className="py-10 sm:py-14">
      <ViewPing topicId={topic.id} />

      <Breadcrumbs
        items={[
          { href: "/learn", label: "Learning Hub" },
          { href: `/learn/${level.number}`, label: level.name },
          { href: subjectHref, label: subject.name },
          { label: topic.title },
        ]}
      />

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
            Topic {position.index} of {position.total}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">{topic.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {authorName ? `By ${authorName} · ` : ""}Updated {formatDate(topic.updated_at)}
            {topic.status !== "published" && (
              <>
                {" "}
                <Badge tone="neutral">{topic.status}</Badge>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {completed && <Badge tone="success">Completed</Badge>}
          <CompletedToggle topicId={topic.id} completed={completed} path={path} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {topic.summary && (
            <Section icon={BookOpen} title="Summary">
              <Prose text={topic.summary} />
            </Section>
          )}

          {topic.key_formulas && (
            <Section icon={Sigma} title="Key formulas">
              <Prose text={topic.key_formulas} className="text-[1.05rem]" />
            </Section>
          )}

          {topic.worked_example && (
            <Section icon={Lightbulb} title="Worked example">
              <Prose text={topic.worked_example} />
            </Section>
          )}

          <section>
            <h2 className="text-lg font-bold text-brand-900">Materials</h2>
            {materials.length === 0 ? (
              <p className="mt-3 rounded-card border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No materials have been added to this topic yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {materials.map((m) => (
                  <MaterialItem key={m.id} material={m} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-brand-200 bg-gradient-to-br from-brand-800 to-brand-950 p-5 text-white shadow-card">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <ClipboardCheck className="h-5 w-5 text-accent-400" aria-hidden="true" />
              {quiz?.title ?? "Quiz"}
            </h2>
            {quizAvailable ? (
              <>
                <p className="mt-2 text-sm text-brand-100">
                  {attemptCount === 0
                    ? "Check your understanding. Every question comes with a worked solution."
                    : `Best score ${formatPercent(bestPercent ?? 0)} · ${attemptCount} ${attemptCount === 1 ? "attempt" : "attempts"}`}
                </p>
                <ButtonLink href={`${path}/quiz`} variant="accent" className="mt-4 w-full">
                  {attemptCount === 0 ? "Take the quiz" : "Take it again"}
                </ButtonLink>
              </>
            ) : (
              <p className="mt-2 text-sm text-brand-100">The quiz for this topic is being prepared.</p>
            )}
          </div>

          <nav className="rounded-card border border-slate-200 bg-white p-4 shadow-card" aria-label="Topic navigation">
            {previous ? (
              <Link href={`${subjectHref}/${previous.slug}`} className="group flex items-center gap-2 py-2 text-sm">
                <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-700" aria-hidden="true" />
                <span>
                  <span className="block text-xs text-slate-500">Previous</span>
                  <span className="font-medium text-slate-800 group-hover:text-brand-700">{previous.title}</span>
                </span>
              </Link>
            ) : (
              <p className="py-2 text-sm text-slate-400">This is the first topic</p>
            )}
            <div className="my-1 border-t border-slate-100" />
            {next ? (
              <Link href={`${subjectHref}/${next.slug}`} className="group flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="block text-xs text-slate-500">Next</span>
                  <span className="font-medium text-slate-800 group-hover:text-brand-700">{next.title}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-700" aria-hidden="true" />
              </Link>
            ) : (
              <Link href={subjectHref} className="block py-2 text-sm font-medium text-brand-700 hover:underline">
                Back to {subject.name}
              </Link>
            )}
          </nav>
        </aside>
      </div>
    </Container>
  );
}
