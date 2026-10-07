import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { Badge, Container, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getEventLists } from "@/lib/events";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  const user = await getCurrentUser();
  const { upcoming, past, registeredIds } = await getEventLists(user?.id);

  return (
    <Container className="py-10 sm:py-14">
      <PageHeader
        eyebrow="Finance Society"
        title="Events"
        description="Guest talks, workshops and company visits. Log in to register in one click."
      />

      <section className="mt-10" aria-labelledby="upcoming">
        <h2 id="upcoming" className="text-xl font-bold text-brand-900">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-card border border-dashed border-slate-300 p-10 text-center">
            <CalendarDays className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-3 font-medium text-slate-700">Nothing scheduled right now</p>
            <p className="mt-1 text-sm text-slate-500">New events are announced on the club&apos;s Telegram channel first.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <div key={event.id} className="relative">
                <EventCard event={event} />
                {registeredIds.has(event.id) && (
                  <Badge tone="success" className="absolute right-3 top-3 shadow">
                    Registered
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-14" aria-labelledby="past">
          <h2 id="past" className="text-xl font-bold text-brand-900">
            Past events
          </h2>
          <ul className="mt-4 divide-y divide-slate-200 rounded-card border border-slate-200 bg-white shadow-card">
            {past.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.slug}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 sm:px-5">
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-800">{event.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-500">
                      {formatDateTime(event.starts_at)}
                      {event.speaker ? ` · ${event.speaker}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-slate-400">Details →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
