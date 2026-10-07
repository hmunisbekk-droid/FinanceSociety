import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Profile, Role } from "@/lib/types";

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile;
}

/** The logged-in user with their profile, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  // Verifies the session token locally (signature + expiry) instead of calling Supabase Auth
  // on every request; the proxy already refreshed it if needed.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle();
  if (!profile) return null;

  const email = typeof claims.email === "string" ? claims.email : (profile as Profile).email;
  return { id: claims.sub, email, profile: profile as Profile };
});

/** Redirects to the login page when nobody is logged in, or to /blocked for blocked accounts. */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  if (user.profile.is_blocked) redirect("/blocked");
  return user;
}

export function isStaff(role: Role) {
  return role === "editor" || role === "admin";
}

/** Editors and admins. */
export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!isStaff(user.profile.role)) redirect("/my");
  return user;
}

/** Admins only. Editors are sent back to the admin home. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireStaff();
  if (user.profile.role !== "admin") redirect("/admin");
  return user;
}
