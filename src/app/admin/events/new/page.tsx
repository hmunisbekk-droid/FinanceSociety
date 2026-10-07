import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { Flash } from "../../_components/flash";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [, flash] = await Promise.all([requireAdmin(), searchParams]);
  return (
    <>
      <Breadcrumbs items={[{ href: "/admin/events", label: "Events" }, { label: "New event" }]} />
      <h1 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">New event</h1>
      <div className="mt-5">
        <Flash {...flash} />
      </div>
      <Card>
        <EventForm event={null} />
      </Card>
    </>
  );
}
