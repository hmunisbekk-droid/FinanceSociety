"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { describeDbError, withFlash } from "@/lib/flash";
import { fromLocalInput } from "@/lib/format";
import { slugify, uniqueSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateEvents(id?: string) {
  revalidatePath("/admin/events", "layout");
  revalidatePath("/events", "layout");
  revalidatePath("/");
  revalidatePath("/my");
  if (id) revalidatePath(`/admin/events/${id}`);
}

const eventSchema = z.object({
  title: z.string().trim().min(2, "Enter a title").max(160),
  slug: z.string().trim().max(80),
  description: z.string().trim().max(10000),
  location: z.string().trim().max(200),
  online_link: z.union([z.literal(""), z.string().trim().url("Enter a valid online link")]),
  speaker: z.string().trim().max(200),
  capacity: z.union([z.literal(""), z.coerce.number().int().positive("Capacity must be a positive number")]),
  status: z.enum(["draft", "review", "published"]),
});

/** Creates (no id) or updates an event (FR-28, FR-33). */
export async function saveEvent(formData: FormData) {
  const id = text(formData, "id");
  const isNew = !id;
  const back = isNew ? "/admin/events/new" : `/admin/events/${id}`;
  if (!isNew && !uuid.safeParse(id).success) redirect("/admin/events");

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    location: formData.get("location"),
    online_link: formData.get("online_link"),
    speaker: formData.get("speaker"),
    capacity: formData.get("capacity"),
    status: formData.get("status"),
  });
  if (!parsed.success) redirect(withFlash(back, { error: parsed.error.issues[0]?.message ?? "Check the form" }));

  const startsAt = fromLocalInput(text(formData, "starts_at"));
  if (!startsAt) redirect(withFlash(back, { error: "Enter the start date and time." }));
  const endsAt = text(formData, "ends_at") ? fromLocalInput(text(formData, "ends_at")) : null;
  if (endsAt && endsAt < startsAt) redirect(withFlash(back, { error: "The end time is before the start time." }));

  const supabase = await createClient();
  const d = parsed.data;
  const base = slugify(d.slug || d.title);
  const slug = await uniqueSlug(base, async (s) => {
    const { data } = await supabase.from("events").select("id").eq("slug", s).neq("id", id || "00000000-0000-0000-0000-000000000000").maybeSingle();
    return Boolean(data);
  });

  const row = {
    title: d.title,
    slug,
    description: d.description,
    starts_at: startsAt,
    ends_at: endsAt,
    location: d.location || null,
    online_link: d.online_link || null,
    speaker: d.speaker || null,
    capacity: d.capacity === "" ? null : d.capacity,
    status: d.status,
  };

  if (isNew) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("events")
      .insert({ ...row, created_by: user?.id ?? null })
      .select("id")
      .single();
    if (error || !data) redirect(withFlash(back, { error: describeDbError(error, "Could not create the event") }));
    revalidateEvents(data.id as string);
    redirect(withFlash(`/admin/events/${data.id}`, { ok: "Event created. You can add a poster below." }));
  }

  const { error } = await supabase.from("events").update(row).eq("id", id);
  if (error) redirect(withFlash(back, { error: describeDbError(error, "Could not save the event") }));
  revalidateEvents(id);
  redirect(withFlash(back, { ok: "Event saved." }));
}

export async function deleteEvent(formData: FormData) {
  const id = text(formData, "id");
  if (!uuid.safeParse(id).success) redirect("/admin/events");
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("poster_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) redirect(withFlash(`/admin/events/${id}`, { error: describeDbError(error, "Could not delete") }));
  const poster = (event as { poster_path: string | null } | null)?.poster_path;
  if (poster) await supabase.storage.from("posters").remove([poster]);
  revalidateEvents();
  redirect(withFlash("/admin/events", { ok: "Event deleted." }));
}

const posterSchema = z.object({ eventId: uuid, path: z.string().min(1).max(300) });

/** Called by the browser after uploading the poster image to the "posters" bucket. */
export async function setEventPoster(input: z.infer<typeof posterSchema>): Promise<{ error?: string }> {
  const parsed = posterSchema.safeParse(input);
  if (!parsed.success || !parsed.data.path.startsWith(`${parsed.data.eventId}/`)) return { error: "Invalid poster." };

  const supabase = await createClient();
  const { data: current } = await supabase.from("events").select("poster_path").eq("id", parsed.data.eventId).maybeSingle();
  const { error } = await supabase.from("events").update({ poster_path: parsed.data.path }).eq("id", parsed.data.eventId);
  if (error) return { error: describeDbError(error, "Could not save the poster") };

  const old = (current as { poster_path: string | null } | null)?.poster_path;
  if (old && old !== parsed.data.path) await supabase.storage.from("posters").remove([old]);
  revalidateEvents(parsed.data.eventId);
  return {};
}

export async function removeEventPoster(formData: FormData) {
  const id = text(formData, "id");
  if (!uuid.safeParse(id).success) redirect("/admin/events");
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("poster_path").eq("id", id).maybeSingle();
  const poster = (event as { poster_path: string | null } | null)?.poster_path;
  await supabase.from("events").update({ poster_path: null }).eq("id", id);
  if (poster) await supabase.storage.from("posters").remove([poster]);
  revalidateEvents(id);
  redirect(withFlash(`/admin/events/${id}`, { ok: "Poster removed." }));
}
