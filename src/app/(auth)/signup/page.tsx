import type { Metadata } from "next";
import Link from "next/link";
import { getLevelsWithCounts } from "@/lib/queries";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage() {
  const levels = await getLevelsWithCounts();
  const domains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().replace(/^@/, ""))
    .filter(Boolean);

  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Join the Finance Society</h1>
      <p className="mt-1 text-sm text-slate-600">
        Free for WIUT students. Get study materials for your level, quizzes and event invitations.
      </p>

      <SignupForm levels={levels.map((l) => ({ id: l.id, number: l.number, label: `${l.name} · ${l.study_year}` }))} domains={domains} />

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
