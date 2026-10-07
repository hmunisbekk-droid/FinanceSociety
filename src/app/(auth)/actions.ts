"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { PROGRAMMES, resolveLevelForProgramme, type LevelRef } from "@/lib/programmes";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

export interface AuthState {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");
const passwordSchema = z.string().min(8, "Use at least 8 characters");

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Domains allowed to sign up (ALLOWED_EMAIL_DOMAINS). Empty = anyone. */
function allowedDomains() {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

/** Only allow redirects inside this site. */
function safeNext(value: FormDataEntryValue | null, fallback = "/my") {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

// ---------------------------------------------------------------------------
// Sign up (FR-01)
// ---------------------------------------------------------------------------
const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: emailSchema,
  password: passwordSchema,
  programme: z.enum(PROGRAMMES, { message: "Choose your programme from the list" }).or(z.literal("")),
  levelId: z.string().uuid().optional().or(z.literal("")),
});

export async function signUp(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    programme: formData.get("programme") ?? "",
    levelId: formData.get("levelId") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { fullName, email, password, programme, levelId } = parsed.data;

  const domains = allowedDomains();
  const domain = email.split("@")[1] ?? "";
  if (domains.length > 0 && !domains.includes(domain)) {
    return {
      fieldErrors: { email: `Please use your WIUT email address (${domains.map((d) => "@" + d).join(", ")})` },
    };
  }

  const supabase = await createClient();

  // CIFS → Level 3; degree programmes → Levels 4–6 (same rule as the form).
  const { data: levelRows } = await supabase.from("levels").select("id, number");
  const level = resolveLevelForProgramme(programme ?? "", levelId ?? "", (levelRows ?? []) as LevelRef[]);
  if (!level.ok) return { fieldErrors: { levelId: level.message } };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, programme: programme || null, level_id: level.levelId },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/my`,
    },
  });
  if (error) return { error: error.message };

  // Email confirmation switched off in Supabase → the user is already logged in.
  if (data.session) redirect("/my");

  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}

// ---------------------------------------------------------------------------
// Log in / log out (FR-02)
// ---------------------------------------------------------------------------
const logInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password") });

export async function logIn(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const parsed = logInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Your email is not verified yet. Check your inbox for the verification link." };
    }
    return { error: "Wrong email or password." };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Password reset (FR-02)
// ---------------------------------------------------------------------------
export async function requestPasswordReset(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0]?.message ?? "Enter a valid email" } };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  // Same message whether or not the account exists, so emails cannot be enumerated.
  return { message: "If an account exists for that email, we have sent a link to set a new password." };
}

export async function resetPassword(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const password = formData.get("password");
  const confirm = formData.get("confirm");
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0]?.message ?? "Invalid password" } };
  if (password !== confirm) return { fieldErrors: { confirm: "Passwords do not match" } };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return { error: "The reset link has expired. Request a new one from the login page." };
  }
  redirect("/my?password=updated");
}

// ---------------------------------------------------------------------------
// Resend the verification email
// ---------------------------------------------------------------------------
export async function resendVerification(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data });
  if (error) return { error: error.message };
  return { message: "Verification email sent again. Check your inbox and spam folder." };
}
