import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/** How the server sees the caller's login — for debugging "logged out after login" reports. */
async function sessionDiagnostics() {
  const cookieStore = await cookies();
  const authCookies = cookieStore.getAll().filter((c) => c.name.startsWith("sb-")).map((c) => `${c.name} (${c.value.length} chars)`);
  if (!isSupabaseConfigured()) return { authCookies, note: "Supabase not configured" };

  const supabase = await createClient();
  const claims = await supabase.auth.getClaims().then(
    ({ data, error }) => (error ? `error: ${error.message}` : data?.claims?.sub ? `ok (user ${data.claims.sub}, alg ${data.header?.alg ?? "?"})` : "no session"),
    (e: unknown) => `threw: ${e instanceof Error ? e.message : String(e)}`,
  );
  const user = await supabase.auth.getUser().then(
    ({ data, error }) => (error ? `error: ${error.message}` : data.user ? `ok (user ${data.user.id})` : "no session"),
    (e: unknown) => `threw: ${e instanceof Error ? e.message : String(e)}`,
  );
  return { authCookies, getClaims: claims, getUser: user };
}

/**
 * Deployment check: reports whether the environment is wired up, without
 * revealing any secret. Open /api/health after a deploy.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const describeKey = (value: string) => {
    if (!value) return "missing";
    const trimmed = value.trim();
    const shape = trimmed.startsWith("sb_publishable_")
      ? "publishable key"
      : trimmed.startsWith("sb_secret_")
        ? "secret key"
        : trimmed.startsWith("eyJ")
          ? "legacy JWT key"
          : "unrecognised format";
    const notes = [
      value !== trimmed ? "had whitespace around it (trimmed automatically)" : "",
      /["'=\s]/.test(trimmed) ? "contains quotes, spaces or '=' — paste the bare value" : "",
    ].filter(Boolean);
    return `${shape}, ${trimmed.length} characters${notes.length ? ` (${notes.join("; ")})` : ""}`;
  };

  let urlStatus: string;
  if (!url) urlStatus = "missing";
  else if (!URL.canParse(url.trim())) urlStatus = `invalid URL (starts with "${url.slice(0, 12)}…")`;
  else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim())) urlStatus = `unexpected shape: ${url.trim().replace(/^(https:\/\/[^/]+).*/, "$1…")}`;
  else urlStatus = "ok";

  let database = "not checked";
  if (urlStatus === "ok" && anon) {
    try {
      const res = await fetch(`${url.trim().replace(/\/$/, "")}/rest/v1/levels?select=number&order=number`, {
        headers: { apikey: anon.trim(), Authorization: `Bearer ${anon.trim()}` },
        cache: "no-store",
      });
      if (res.ok) {
        const rows = (await res.json()) as Array<{ number: number }>;
        database = `ok — ${rows.length} levels visible`;
      } else {
        database = `error ${res.status}: ${(await res.text()).slice(0, 160)}`;
      }
    } catch (error) {
      database = `request failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  return NextResponse.json(
    {
      supabaseUrl: urlStatus,
      anonKey: describeKey(anon),
      serviceRoleKey: describeKey(service),
      siteUrl: siteUrl || "missing (auth links will point to localhost)",
      database,
      session: await sessionDiagnostics(),
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
