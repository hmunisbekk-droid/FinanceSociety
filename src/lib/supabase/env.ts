// Values are trimmed: a stray space or line break pasted into a hosting dashboard must not break requests.
export function supabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set in .env.local");
  return url.replace(/\/+$/, "");
}

export function supabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local");
  return key;
}

export function supabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in .env.local");
  return key;
}

/** True once the Supabase values are filled in and the URL parses. Lets pages render a setup hint otherwise. */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key && URL.canParse(url));
}
