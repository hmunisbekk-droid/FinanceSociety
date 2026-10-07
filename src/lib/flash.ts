/** Appends ?ok= / ?error= to a path so the next page can show a one-off message. */
export function withFlash(path: string, flash: { ok?: string; error?: string }) {
  const url = new URL(path, "http://local");
  if (flash.ok) url.searchParams.set("ok", flash.ok);
  if (flash.error) url.searchParams.set("error", flash.error);
  return url.pathname + url.search;
}

/** Turns a Supabase/Postgres error into a sentence for the admin. */
export function describeDbError(error: { code?: string; message: string } | null | undefined, fallback = "Something went wrong") {
  if (!error) return fallback;
  if (error.message.includes("Only admins can publish")) return "Only admins can publish content. Set the status to “Ready for review” instead.";
  if (error.code === "42501") return "You do not have permission to do that.";
  if (error.code === "23505") return "Something with that name or slug already exists.";
  if (error.code === "23503") return "That item is still referenced by something else.";
  return `${fallback}: ${error.message}`;
}
