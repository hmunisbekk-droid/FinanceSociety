import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { ResendForm } from "./resend-form";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;

  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <MailCheck className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-brand-900">Check your email</h1>
      <p className="mt-2 text-sm text-slate-600">
        We sent a verification link{email ? ` to ${email}` : ""}. Click it to activate your account. If you cannot see
        it, check your spam folder.
      </p>
      {email && <ResendForm email={email} />}
    </div>
  );
}
