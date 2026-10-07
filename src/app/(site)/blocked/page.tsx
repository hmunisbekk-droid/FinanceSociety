import type { Metadata } from "next";
import { Ban } from "lucide-react";
import { Button, Container } from "@/components/ui";
import { signOut } from "@/app/(auth)/actions";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Account blocked" };

export default function BlockedPage() {
  return (
    <Container className="flex max-w-lg flex-col items-center py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700">
        <Ban className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-2xl font-bold text-brand-900">This account has been blocked</h1>
      <p className="mt-2 text-slate-600">
        If you think this is a mistake, write to{" "}
        <a href={`mailto:${site.contactEmail}`} className="text-brand-700 underline">
          {site.contactEmail}
        </a>
        .
      </p>
      <form action={signOut} className="mt-6">
        <Button type="submit" variant="secondary">
          Log out
        </Button>
      </form>
    </Container>
  );
}
