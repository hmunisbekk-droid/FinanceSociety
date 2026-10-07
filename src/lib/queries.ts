import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Level, SiteEvent } from "@/lib/types";

export interface LevelWithCount extends Level {
  subjectCount: number;
}

/** Levels in order with the number of subjects the current viewer can see. */
export async function getLevelsWithCounts(): Promise<LevelWithCount[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("levels")
    .select("*, subjects(count)")
    .order("sort_order");
  if (error) {
    console.warn("getLevelsWithCounts:", error.message);
    return [];
  }
  return (data ?? []).map((row) => {
    const { subjects, ...level } = row as Level & { subjects: Array<{ count: number }> };
    return { ...level, subjectCount: subjects?.[0]?.count ?? 0 };
  });
}

/** Published events that have not started yet, soonest first. */
export async function getUpcomingEvents(limit = 3): Promise<SiteEvent[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(limit);
  if (error) {
    console.warn("getUpcomingEvents:", error.message);
    return [];
  }
  return (data ?? []) as SiteEvent[];
}

/** Public URL of a poster in the "posters" bucket. */
export function posterUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/posters/${path}`;
}
