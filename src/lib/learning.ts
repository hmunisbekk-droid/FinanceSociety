import { createClient } from "@/lib/supabase/server";
import type { Level, Material, Quiz, Subject, Topic, TopicProgress } from "@/lib/types";

// ---------------------------------------------------------------------------
// Level page: subjects with topic counts (and the student's completed counts)
// ---------------------------------------------------------------------------
export interface SubjectCard extends Subject {
  topicCount: number;
  completedCount: number;
}

export async function getLevelPage(levelNumber: number, userId?: string) {
  const supabase = await createClient();

  const { data: level } = await supabase.from("levels").select("*").eq("number", levelNumber).maybeSingle();
  if (!level) return null;

  const { data: subjectRows } = await supabase
    .from("subjects")
    .select("*, topics(count)")
    .eq("level_id", level.id)
    .order("sort_order");

  const subjects: SubjectCard[] = (subjectRows ?? []).map((row) => {
    const { topics, ...subject } = row as Subject & { topics: Array<{ count: number }> };
    return { ...subject, topicCount: topics?.[0]?.count ?? 0, completedCount: 0 };
  });

  if (userId && subjects.length > 0) {
    const { data: done } = await supabase
      .from("topic_progress")
      .select("topic_id, topics!inner(subject_id)")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .in(
        "topics.subject_id",
        subjects.map((s) => s.id),
      );
    // A to-one embed comes back as an object; the untyped client guesses an array.
    type DoneRow = { topics: { subject_id: string } | Array<{ subject_id: string }> };
    for (const row of (done ?? []) as unknown as DoneRow[]) {
      const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;
      const subject = subjects.find((s) => s.id === topic?.subject_id);
      if (subject) subject.completedCount += 1;
    }
  }

  return { level: level as Level, subjects };
}

// ---------------------------------------------------------------------------
// Subject page: topics in teaching order with status and best score (FR-10)
// ---------------------------------------------------------------------------
export interface TopicRow extends Topic {
  quiz: Pick<Quiz, "id" | "status"> | null;
  completed: boolean;
  opened: boolean;
  bestPercent: number | null;
}

export async function getSubjectPage(levelNumber: number, subjectSlug: string, userId?: string) {
  const supabase = await createClient();

  const { data: level } = await supabase.from("levels").select("*").eq("number", levelNumber).maybeSingle();
  if (!level) return null;

  const { data: subject } = await supabase
    .from("subjects")
    .select("*")
    .eq("level_id", level.id)
    .eq("slug", subjectSlug)
    .maybeSingle();
  if (!subject) return null;

  const { data: topicRows } = await supabase
    .from("topics")
    .select("*, quizzes(id, status)")
    .eq("subject_id", subject.id)
    .order("sort_order");

  const topics: TopicRow[] = (topicRows ?? []).map((row) => {
    const { quizzes, ...topic } = row as Topic & { quizzes: Array<Pick<Quiz, "id" | "status">> };
    return { ...topic, quiz: quizzes?.[0] ?? null, completed: false, opened: false, bestPercent: null };
  });

  if (userId && topics.length > 0) {
    const topicIds = topics.map((t) => t.id);
    const quizIds = topics.map((t) => t.quiz?.id).filter((id): id is string => Boolean(id));

    const [{ data: progress }, { data: attempts }] = await Promise.all([
      supabase.from("topic_progress").select("topic_id, completed_at").eq("user_id", userId).in("topic_id", topicIds),
      quizIds.length > 0
        ? supabase.from("quiz_attempts").select("quiz_id, percent").eq("user_id", userId).in("quiz_id", quizIds)
        : Promise.resolve({ data: [] as Array<{ quiz_id: string; percent: number }> }),
    ]);

    for (const row of (progress ?? []) as Array<Pick<TopicProgress, "topic_id" | "completed_at">>) {
      const topic = topics.find((t) => t.id === row.topic_id);
      if (topic) {
        topic.opened = true;
        topic.completed = row.completed_at !== null;
      }
    }
    for (const row of (attempts ?? []) as Array<{ quiz_id: string; percent: number }>) {
      const topic = topics.find((t) => t.quiz?.id === row.quiz_id);
      if (topic) topic.bestPercent = Math.max(topic.bestPercent ?? 0, Number(row.percent));
    }
  }

  return { level: level as Level, subject: subject as Subject, topics };
}

// ---------------------------------------------------------------------------
// Topic page (FR-11)
// ---------------------------------------------------------------------------
export interface MaterialView extends Material {
  openUrl: string | null;
  downloadUrl: string | null;
}

export interface TopicNeighbour {
  title: string;
  slug: string;
}

export async function getTopicPage(levelNumber: number, subjectSlug: string, topicSlug: string, userId: string) {
  const supabase = await createClient();

  const { data: level } = await supabase.from("levels").select("*").eq("number", levelNumber).maybeSingle();
  if (!level) return null;

  const { data: subject } = await supabase
    .from("subjects")
    .select("*")
    .eq("level_id", level.id)
    .eq("slug", subjectSlug)
    .maybeSingle();
  if (!subject) return null;

  const { data: topic } = await supabase
    .from("topics")
    .select("*")
    .eq("subject_id", subject.id)
    .eq("slug", topicSlug)
    .maybeSingle();
  if (!topic) return null;

  const [{ data: materialRows }, { data: quiz }, { data: author }, { data: progress }, { data: siblings }] = await Promise.all([
    supabase.from("materials").select("*").eq("topic_id", topic.id).eq("status", "published").order("sort_order"),
    supabase.from("quizzes").select("*").eq("topic_id", topic.id).maybeSingle(),
    topic.author_id
      ? supabase.from("profile_names").select("full_name").eq("id", topic.author_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("topic_progress").select("*").eq("user_id", userId).eq("topic_id", topic.id).maybeSingle(),
    supabase.from("topics").select("title, slug, sort_order").eq("subject_id", subject.id).order("sort_order"),
  ]);

  let bestPercent: number | null = null;
  let attemptCount = 0;
  if (quiz) {
    const { data: quizAttempts } = await supabase
      .from("quiz_attempts")
      .select("percent")
      .eq("user_id", userId)
      .eq("quiz_id", quiz.id);
    for (const a of (quizAttempts ?? []) as Array<{ percent: number }>) {
      bestPercent = Math.max(bestPercent ?? 0, Number(a.percent));
      attemptCount += 1;
    }
  }

  // Signed links for uploaded files; the bucket is private (FR-16).
  const materials: MaterialView[] = await Promise.all(
    ((materialRows ?? []) as Material[]).map(async (m) => {
      let openUrl: string | null = m.external_url;
      let downloadUrl: string | null = null;
      if (m.storage_path) {
        const [open, download] = await Promise.all([
          supabase.storage.from("materials").createSignedUrl(m.storage_path, 60 * 60),
          m.allow_download
            ? supabase.storage.from("materials").createSignedUrl(m.storage_path, 60 * 60, { download: true })
            : Promise.resolve({ data: null }),
        ]);
        openUrl = open.data?.signedUrl ?? null;
        downloadUrl = download.data?.signedUrl ?? null;
      }
      return { ...m, openUrl, downloadUrl };
    }),
  );

  const ordered = (siblings ?? []) as Array<TopicNeighbour & { sort_order: number }>;
  const index = ordered.findIndex((t) => t.slug === topic.slug);
  const previous = index > 0 ? ordered[index - 1]! : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1]! : null;

  return {
    level: level as Level,
    subject: subject as Subject,
    topic: topic as Topic,
    materials,
    quiz: (quiz as Quiz | null) ?? null,
    authorName: (author as { full_name: string } | null)?.full_name ?? null,
    progress: (progress as TopicProgress | null) ?? null,
    bestPercent,
    attemptCount,
    previous,
    next,
    position: { index: index + 1, total: ordered.length },
  };
}

export function topicHref(levelNumber: number, subjectSlug: string, topicSlug?: string) {
  const base = `/learn/${levelNumber}/${subjectSlug}`;
  return topicSlug ? `${base}/${topicSlug}` : base;
}
