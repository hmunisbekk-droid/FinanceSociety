import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, PageHeader, buttonClasses } from "@/components/ui";
import { getEventsAdmin } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { Flash } from "../_components/flash";
import { StatusBadge } from "../_components/status-badge";

export const metadata: Metadata = { title: "Events" };

export default async function EventsAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [, events, flash] = await Promise.all([requireAdmin(), getEventsAdmin(), searchParams]);

  return (
    <>
      <PageHeader
        eyebrow="Events"
        title="All events"
        description="Drafts are only visible here. Publish an event to put it on the site."
        actions={
          <Link href="/admin/events/new" className={buttonClasses("primary")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New event
          </Link>
        }
      />
      <div className="mt-6">
        <Flash {...flash} />
      </div>

      <Card className="p-0">
        {events.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Event</th>
                  <th className="px-3 py-3 font-semibold">When</th>
                  <th className="px-3 py-3 font-semibold">Registered</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => {
                  return (
                    <tr key={event.id} className={event.past ? "text-slate-500" : ""}>
                      <td className="px-5 py-3">
                        <Link href={`/admin/events/${event.id}`} className="font-medium text-brand-900 hover:underline">
                          {event.title}
                        </Link>
                        <p className="text-xs text-slate-500">{event.location ?? (event.online_link ? "Online" : "")}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">{formatDateTime(event.starts_at)}</td>
                      <td className="px-3 py-3">
                        {event.registrations}
                        {event.capacity ? ` / ${event.capacity}` : ""}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={event.status} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/admin/events/${event.id}`} className={buttonClasses("secondary", "sm")}>
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
