import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  // The reset link logs the user in first; without a session there is nothing to update.
  const user = await getCurrentUser();
  if (!user) redirect("/forgot-password");

  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Set a new password</h1>
      <p className="mt-1 text-sm text-slate-600">For {user.email}</p>
      <ResetPasswordForm />
    </>
  );
}
