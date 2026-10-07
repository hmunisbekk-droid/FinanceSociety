// Promotes an existing account to admin and marks its email as verified.
// Usage: npm run make-admin -- you@example.com
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- you@example.com");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: profile, error } = await supabase
  .from("profiles")
  .select("id, role, full_name")
  .ilike("email", email)
  .maybeSingle();

if (error) {
  console.error("Database error:", error.message);
  process.exit(1);
}
if (!profile) {
  console.error(`No account with the email ${email}. Sign up on the site first, then run this again.`);
  process.exit(1);
}

const { error: updateError } = await supabase.from("profiles").update({ role: "admin" }).eq("id", profile.id);
if (updateError) {
  console.error("Could not update the role:", updateError.message);
  process.exit(1);
}

// Skip email verification for the admin, in case the confirmation email did not arrive.
const { error: confirmError } = await supabase.auth.admin.updateUserById(profile.id, { email_confirm: true });
if (confirmError) {
  console.warn("Role updated, but could not mark the email as verified:", confirmError.message);
}

console.log(`${profile.full_name || email} is now an admin.`);
