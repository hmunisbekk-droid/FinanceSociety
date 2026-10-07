import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SiteEvent } from "@/lib/types";

/** Published events split into upcoming (soonest first) and past (latest first). */
export async function getEventLists(userId?: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: upcoming }, { data: past }, { data: mine }] = await Promise.all([
    supabase.from("events").select("*").gte("starts_at", now).order("starts_at"),
    supabase.from("events").select("*").lt("starts_at", now).order("starts_at", { ascending: false }).limit(24),
    userId
      ? supabase.from("event_registrations").select("event_id").eq("user_id", userId).is("cancelled_at", null)
      : Promise.resolve({ data: [] as Array<{ event_id: string }> }),
  ]);

  return {
    upcoming: (upcoming ?? []) as SiteEvent[],
    past: (past ?? []) as SiteEvent[],
    registeredIds: new Set(((mine ?? []) as Array<{ event_id: string }>).map((r) => r.event_id)),
  };
}

export interface EventDetail {
  event: SiteEvent;
  taken: number;
  isRegistered: boolean;
  isPast: boolean;
  isFull: boolean;
}

export async function getEventBySlug(slug: string, userId?: string): Promise<EventDetail | null> {
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!event) return null;

  // Students cannot read other people's registrations, so the seat count comes from the service role.
  const admin = createAdminClient();
  const [{ count }, { data: mine }] = await Promise.all([
    admin.from("event_registrations").select("*", { count: "exact", head: true }).eq("event_id", event.id).is("cancelled_at", null),
    userId
      ? supabase
          .from("event_registrations")
          .select("id")
          .eq("event_id", event.id)
          .eq("user_id", userId)
          .is("cancelled_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const taken = count ?? 0;
  const e = event as SiteEvent;
  return {
    event: e,
    taken,
    isRegistered: Boolean(mine),
    isPast: new Date(e.starts_at) < new Date(),
    isFull: e.capacity !== null && taken >= e.capacity,
  };
}
