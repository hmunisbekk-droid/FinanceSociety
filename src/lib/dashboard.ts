import { createClient } from "@/lib/supabase/server";
import type { SiteEvent } from "@/lib/types";

export interface SubjectProgress {
  id: string;
  name: string;
  slug: string;
  levelNumber: number;
  completed: number;
  total: number;
}

export interface RecentScore {
  attemptId: string;
  percent: number;
  submittedAt: string;
  topicTitle: string;
  href: string;
}

export interface ContinueTopic {
  title: string;
  subjectName: string;
  href: string;
  lastOpenedAt: string;
}

type TopicRef = {
  id: string;
  title: string;
  slug: string;
  subjects: { id: string; name: string; slug: string; levels: { number: number } };
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function topicHref(ref: TopicRef) {
  const subject = one(ref.subjects);
  const level = subject ? one(subject.levels) : null;
  return subject && level ? `/learn/${level.number}/${subject.slug}/${ref.slug}` : "/learn";
}

/** Everything the "My learning" page shows (FR-26, FR-27). */
export async function getDashboard(userId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: progressRows }, { data: attemptRows }, { data: registrationRows }] = await Promise.all([
    supabase
      .from("topic_progress")
      .select("completed_at, last_opened_at, topics!inner(id, title, slug, subjects!inner(id, name, slug, levels!inner(number)))")
      .eq("user_id", userId)
      .order("last_opened_at", { ascending: false }),
    supabase
      .from("quiz_attempts")
      .select("id, percent, submitted_at, quizzes!inner(topics!inner(id, title, slug, subjects!inner(id, name, slug, levels!inner(number))))")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase
      .from("event_registrations")
      .select("events!inner(*)")
      .eq("user_id", userId)
      .is("cancelled_at", null)
      .gte("events.starts_at", now),
  ]);

  type ProgressRow = { completed_at: string | null; last_opened_at: string; topics: TopicRef | TopicRef[] };
  const progress = ((progressRows ?? []) as unknown as ProgressRow[])
    .map((r) => ({ ...r, topic: one(r.topics) }))
    .filter((r): r is ProgressRow & { topic: TopicRef } => r.topic !== null);

  // Subjects the student has touched, with completed counts.
  const subjects = new Map<string, SubjectProgress>();
  for (const row of progress) {
    const subject = one(row.topic.subjects);
    const level = subject ? one(subject.levels) : null;
    if (!subject || !level) continue;
    const entry = subjects.get(subject.id) ?? {
      id: subject.id,
      name: subject.name,
      slug: subject.slug,
      levelNumber: level.number,
      completed: 0,
      total: 0,
    };
    if (row.completed_at) entry.completed += 1;
    subjects.set(subject.id, entry);
  }

  // Totals = published topics per subject (what the student can see).
  if (subjects.size > 0) {
    const { data: totals } = await supabase
      .from("topics")
      .select("subject_id")
      .in("subject_id", [...subjects.keys()]);
    for (const t of (totals ?? []) as Array<{ subject_id: string }>) {
      const entry = subjects.get(t.subject_id);
      if (entry) entry.total += 1;
    }
  }

  const latest = progress[0];
  const continueTopic: ContinueTopic | null = latest
    ? {
        title: latest.topic.title,
        subjectName: one(latest.topic.subjects)?.name ?? "",
        href: topicHref(latest.topic),
        lastOpenedAt: latest.last_opened_at,
      }
    : null;

  type AttemptRow = { id: string; percent: number; submitted_at: string; quizzes: { topics: TopicRef | TopicRef[] } | Array<{ topics: TopicRef | TopicRef[] }> };
  const recentScores: RecentScore[] = ((attemptRows ?? []) as unknown as AttemptRow[]).flatMap((a) => {
    const quiz = one(a.quizzes);
    const topic = quiz ? one(quiz.topics) : null;
    if (!topic) return [];
    return [{ attemptId: a.id, percent: Number(a.percent), submittedAt: a.submitted_at, topicTitle: topic.title, href: `${topicHref(topic)}/quiz` }];
  });

  type RegistrationRow = { events: SiteEvent | SiteEvent[] };
  const upcomingEvents = ((registrationRows ?? []) as unknown as RegistrationRow[])
    .map((r) => one(r.events))
    .filter((e): e is SiteEvent => e !== null)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return {
    subjects: [...subjects.values()].sort((a, b) => a.levelNumber - b.levelNumber || a.name.localeCompare(b.name)),
    continueTopic,
    recentScores,
    upcomingEvents,
  };
}
