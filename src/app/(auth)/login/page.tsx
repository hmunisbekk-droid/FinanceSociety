import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Log in</h1>
      <p className="mt-1 text-sm text-slate-600">Welcome back. Pick up where you left off.</p>

      {error === "link" && (
        <Alert tone="error" className="mt-4">
          That link is invalid or has expired. Log in, or request a new link below.
        </Alert>
      )}

      <LoginForm next={next} />

      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
