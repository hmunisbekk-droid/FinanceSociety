import { createClient } from "@/lib/supabase/server";
import type { MaterialType } from "@/lib/types";

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchResults {
  subjects: SearchHit[];
  topics: SearchHit[];
  materials: Array<SearchHit & { type: MaterialType }>;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function snippet(text: string, max = 140) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

/** Keyword search across subjects, topics and materials (FR-14). Row security hides what the viewer may not see. */
export async function searchContent(query: string): Promise<SearchResults> {
  const q = query.replace(/[%_,()\\]/g, " ").trim();
  if (q.length < 2) return { subjects: [], topics: [], materials: [] };
  const term = `%${q}%`;
  const supabase = await createClient();

  const [{ data: subjects }, { data: topics }, { data: materials }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, slug, description, levels!inner(number, name)")
      .or(`name.ilike.${term},description.ilike.${term}`)
      .limit(10),
    supabase
      .from("topics")
      .select("id, title, slug, summary, subjects!inner(name, slug, levels!inner(number))")
      .or(`title.ilike.${term},summary.ilike.${term},key_formulas.ilike.${term}`)
      .limit(20),
    supabase
      .from("materials")
      .select("id, title, type, topics!inner(title, slug, subjects!inner(name, slug, levels!inner(number)))")
      .ilike("title", term)
      .limit(20),
  ]);

  type SubjectRow = { id: string; name: string; slug: string; description: string; levels: { number: number; name: string } | Array<{ number: number; name: string }> };
  type TopicRow = { id: string; title: string; slug: string; summary: string; subjects: { name: string; slug: string; levels: { number: number } | Array<{ number: number }> } | Array<{ name: string; slug: string; levels: { number: number } | Array<{ number: number }> }> };
  type MaterialRow = { id: string; title: string; type: MaterialType; topics: TopicRow["subjects"] extends infer S ? { title: string; slug: string; subjects: S } | Array<{ title: string; slug: string; subjects: S }> : never };

  return {
    subjects: ((subjects ?? []) as unknown as SubjectRow[]).flatMap((s) => {
      const level = one(s.levels);
      if (!level) return [];
      return [{ id: s.id, title: s.name, subtitle: `${level.name} · ${snippet(s.description)}`, href: `/learn/${level.number}/${s.slug}` }];
    }),
    topics: ((topics ?? []) as unknown as TopicRow[]).flatMap((t) => {
      const subject = one(t.subjects);
      const level = subject ? one(subject.levels) : null;
      if (!subject || !level) return [];
      return [{ id: t.id, title: t.title, subtitle: `${subject.name} · ${snippet(t.summary)}`, href: `/learn/${level.number}/${subject.slug}/${t.slug}` }];
    }),
    materials: ((materials ?? []) as unknown as MaterialRow[]).flatMap((m) => {
      const topic = one(m.topics);
      const subject = topic ? one(topic.subjects) : null;
      const level = subject ? one(subject.levels) : null;
      if (!topic || !subject || !level) return [];
      return [{ id: m.id, title: m.title, type: m.type, subtitle: `${topic.title} · ${subject.name}`, href: `/learn/${level.number}/${subject.slug}/${topic.slug}` }];
    }),
  };
}
