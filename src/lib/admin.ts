import { createClient } from "@/lib/supabase/server";
import type { ContentStatus, Level, Material, Profile, Question, QuestionOption, Quiz, SiteEvent, Subject, Topic } from "@/lib/types";

// ---------------------------------------------------------------------------
// Content tree
// ---------------------------------------------------------------------------
export interface SubjectNode extends Subject {
  topicCount: number;
}
export interface LevelNode extends Level {
  subjects: SubjectNode[];
}

export async function getContentTree(): Promise<LevelNode[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("levels")
    .select("*, subjects(*, topics(count))")
    .order("sort_order")
    .order("sort_order", { referencedTable: "subjects" });

  type Row = Level & { subjects: Array<Subject & { topics: Array<{ count: number }> }> };
  return ((data ?? []) as Row[]).map((level) => ({
    ...level,
    subjects: (level.subjects ?? []).map(({ topics, ...subject }) => ({
      ...subject,
      topicCount: topics?.[0]?.count ?? 0,
    })),
  }));
}

export interface TopicSummary extends Topic {
  quiz: Pick<Quiz, "id" | "status"> | null;
}

export async function getSubjectAdmin(subjectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("*, levels(id, number, name), topics(*, quizzes(id, status))")
    .eq("id", subjectId)
    .order("sort_order", { referencedTable: "topics" })
    .maybeSingle();
  if (!data) return null;

  type Row = Subject & {
    levels: Pick<Level, "id" | "number" | "name">;
    topics: Array<Topic & { quizzes: Pick<Quiz, "id" | "status"> | Array<Pick<Quiz, "id" | "status">> | null }>;
  };
  const row = data as unknown as Row;
  return {
    subject: row as Subject,
    level: row.levels,
    topics: (row.topics ?? []).map(({ quizzes, ...topic }) => ({
      ...topic,
      quiz: Array.isArray(quizzes) ? (quizzes[0] ?? null) : quizzes,
    })) as TopicSummary[],
  };
}

export interface QuestionWithOptions extends Question {
  question_options: QuestionOption[];
}

export async function getTopicAdmin(topicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("topics")
    .select("*, subjects(id, name, slug, levels(number, name))")
    .eq("id", topicId)
    .maybeSingle();
  if (!data) return null;

  type Row = Topic & { subjects: Pick<Subject, "id" | "name" | "slug"> & { levels: Pick<Level, "number" | "name"> } };
  const row = data as unknown as Row;

  const [{ data: materials }, { data: quiz }] = await Promise.all([
    supabase.from("materials").select("*").eq("topic_id", topicId).order("sort_order"),
    supabase
      .from("quizzes")
      .select("*, questions(*, question_options(*))")
      .eq("topic_id", topicId)
      .order("sort_order", { referencedTable: "questions" })
      .maybeSingle(),
  ]);

  type QuizRow = Quiz & { questions: QuestionWithOptions[] };
  const quizRow = (quiz as QuizRow | null) ?? null;
  if (quizRow) {
    for (const q of quizRow.questions ?? []) {
      q.question_options = [...(q.question_options ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    }
  }

  return {
    topic: row as Topic,
    subject: row.subjects,
    level: row.subjects.levels,
    materials: (materials ?? []) as Material[],
    quiz: quizRow,
    publicPath: `/learn/${row.subjects.levels.number}/${row.subjects.slug}/${row.slug}`,
  };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export interface EventAdminRow extends SiteEvent {
  registrations: number;
  past: boolean;
}

export async function getEventsAdmin(): Promise<EventAdminRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*, event_registrations(count)")
    .is("event_registrations.cancelled_at", null)
    .order("starts_at", { ascending: false });
  const now = Date.now();
  type Row = SiteEvent & { event_registrations: Array<{ count: number }> };
  return ((data ?? []) as Row[]).map(({ event_registrations, ...event }) => ({
    ...event,
    registrations: event_registrations?.[0]?.count ?? 0,
    past: new Date(event.starts_at).getTime() < now,
  }));
}

export interface Attendee {
  registeredAt: string;
  fullName: string;
  email: string;
  programme: string | null;
  levelNumber: number | null;
}

export async function getEventAdmin(eventId: string) {
  const supabase = await createClient();
  const [{ data: event }, { data: regs }] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
    supabase
      .from("event_registrations")
      .select("created_at, profiles(full_name, email, programme, levels(number))")
      .eq("event_id", eventId)
      .is("cancelled_at", null)
      .order("created_at"),
  ]);
  if (!event) return null;

  type Row = { created_at: string; profiles: { full_name: string; email: string; programme: string | null; levels: { number: number } | null } | null };
  const attendees: Attendee[] = ((regs ?? []) as unknown as Row[]).map((r) => ({
    registeredAt: r.created_at,
    fullName: r.profiles?.full_name ?? "",
    email: r.profiles?.email ?? "",
    programme: r.profiles?.programme ?? null,
    levelNumber: r.profiles?.levels?.number ?? null,
  }));

  return { event: event as SiteEvent, attendees };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export interface UserRow extends Profile {
  levelNumber: number | null;
  editorSubjects: Array<{ id: string; name: string }>;
}

export async function getUsersAdmin(query?: string): Promise<UserRow[]> {
  const supabase = await createClient();
  let request = supabase
    .from("profiles")
    .select("*, levels(number), editor_subjects(subjects(id, name))")
    .order("created_at", { ascending: false })
    .limit(300);
  if (query) {
    const q = query.replace(/[%,]/g, "").trim();
    if (q) request = request.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  const { data } = await request;

  type Row = Profile & {
    levels: { number: number } | null;
    editor_subjects: Array<{ subjects: { id: string; name: string } | null }>;
  };
  return ((data ?? []) as unknown as Row[]).map(({ levels, editor_subjects, ...profile }) => ({
    ...profile,
    levelNumber: levels?.number ?? null,
    editorSubjects: (editor_subjects ?? []).flatMap((e) => (e.subjects ? [e.subjects] : [])),
  }));
}

export async function getUserAdmin(userId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: assigned }, tree] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("editor_subjects").select("subject_id").eq("user_id", userId),
    getContentTree(),
  ]);
  if (!profile) return null;
  return {
    profile: profile as Profile,
    assignedIds: new Set(((assigned ?? []) as Array<{ subject_id: string }>).map((a) => a.subject_id)),
    tree,
  };
}

// ---------------------------------------------------------------------------
// Statistics (FR-38)
// ---------------------------------------------------------------------------
export interface AdminStats {
  registered: number;
  active_week: number;
  published_topics: number;
  topics_with_quiz: number;
  event_registrations: number;
  most_viewed: Array<{ id: string; title: string; subject: string; views: number }>;
  quiz_averages: Array<{ id: string; title: string; subject: string; avg_percent: number; attempts: number }>;
}

export async function getAdminStats(): Promise<AdminStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) {
    console.warn("admin_stats:", error.message);
    return null;
  }
  return data as AdminStats;
}

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Draft",
  review: "Ready for review",
  published: "Published",
};
