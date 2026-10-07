import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, CirclePlay, ClipboardCheck } from "lucide-react";
import { Alert, ButtonLink, Container } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { getDashboard } from "@/lib/dashboard";
import { formatDateTime, formatPercent } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My learning" };

export default async function MyLearningPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const [user, { password }] = await Promise.all([requireUser("/my"), searchParams]);
  const dashboard = await getDashboard(user.id);

  let myLevelNumber: number | null = null;
  if (user.profile.level_id) {
    const supabase = await createClient();
    const { data } = await supabase.from("levels").select("number").eq("id", user.profile.level_id).maybeSingle();
    myLevelNumber = (data as { number: number } | null)?.number ?? null;
  }

  const firstName = user.profile.full_name.split(" ")[0] || "there";

  return (
    <Container className="py-10 sm:py-14">
      {password === "updated" && (
        <Alert tone="success" className="mb-6">
          Your password has been updated.
        </Alert>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">My learning</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">Hi, {firstName}</h1>
          <p className="mt-2 text-slate-600">
            {user.profile.programme ? `${user.profile.programme} · ` : ""}
            {myLevelNumber ? `Level ${myLevelNumber}` : "No level set yet"}
            {" · "}
            <Link href="/account" className="text-brand-700 hover:underline">
              Edit profile
            </Link>
          </p>
        </div>
        {myLevelNumber && (
          <ButtonLink href={`/learn/${myLevelNumber}`} variant="secondary">
            Open Level {myLevelNumber}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        )}
      </div>

      {/* Continue where you left off (FR-27) */}
      {dashboard.continueTopic ? (
        <Link
          href={dashboard.continueTopic.href}
          className="group mt-8 flex items-center gap-4 rounded-card border border-brand-200 bg-gradient-to-r from-brand-800 to-brand-900 p-5 text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
            <CirclePlay className="h-6 w-6 text-accent-400" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-brand-200">Continue where you left off</span>
            <span className="block truncate text-lg font-bold">{dashboard.continueTopic.title}</span>
            <span className="block text-sm text-brand-100">{dashboard.continueTopic.subjectName}</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-accent-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      ) : (
        <div className="mt-8 rounded-card border border-dashed border-slate-300 p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-3 font-medium text-slate-700">You have not opened any topics yet</p>
          <p className="mt-1 text-sm text-slate-500">Pick your level in the Learning Hub to get started.</p>
          <ButtonLink href={myLevelNumber ? `/learn/${myLevelNumber}` : "/learn"} className="mt-4">
            Go to the Learning Hub
          </ButtonLink>
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        {/* Subjects in progress (FR-26) */}
        <section aria-labelledby="subjects">
          <h2 id="subjects" className="text-xl font-bold text-brand-900">
            Subjects in progress
          </h2>
          {dashboard.subjects.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Subjects appear here once you open a topic.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {dashboard.subjects.map((s) => {
                const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/learn/${s.levelNumber}/${s.slug}`}
                      className="block rounded-card border border-slate-200 bg-white p-4 shadow-card transition-colors hover:border-brand-300"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-brand-900">{s.name}</span>
                        <span className="text-sm text-slate-500">Level {s.levelNumber}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div
                          className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                          aria-label={`${s.name} progress`}
                        >
                          <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-24 text-right text-sm text-slate-600">
                          {s.completed}/{s.total} · {pct}%
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-8">
          {/* Last 5 quiz scores (FR-26) */}
          <section aria-labelledby="scores">
            <h2 id="scores" className="text-xl font-bold text-brand-900">
              Recent quiz scores
            </h2>
            {dashboard.recentScores.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Your last five quiz results will show here.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-200 rounded-card border border-slate-200 bg-white shadow-card">
                {dashboard.recentScores.map((score) => (
                  <li key={score.attemptId}>
                    <Link href={score.href} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                      <ClipboardCheck className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-800">{score.topicTitle}</span>
                        <span className="block text-sm text-slate-500">{formatDateTime(score.submittedAt)}</span>
                      </span>
                      <span className={cn("text-lg font-bold", score.percent >= 70 ? "text-green-700" : score.percent >= 40 ? "text-accent-600" : "text-red-700")}>
                        {formatPercent(score.percent)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Registered events */}
          <section aria-labelledby="my-events">
            <h2 id="my-events" className="text-xl font-bold text-brand-900">
              Your upcoming events
            </h2>
            {dashboard.upcomingEvents.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                You are not registered for any events.{" "}
                <Link href="/events" className="text-brand-700 hover:underline">
                  See what&apos;s on
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-200 rounded-card border border-slate-200 bg-white shadow-card">
                {dashboard.upcomingEvents.map((event) => (
                  <li key={event.id}>
                    <Link href={`/events/${event.slug}`} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                      <CalendarDays className="h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-800">{event.title}</span>
                        <span className="block text-sm text-slate-500">{formatDateTime(event.starts_at)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Container>
  );
}
