import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Trash } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button, Card, buttonClasses } from "@/components/ui";
import { getEventAdmin } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { posterUrl } from "@/lib/queries";
import { ConfirmButton } from "../../_components/confirm-button";
import { Flash } from "../../_components/flash";
import { deleteEvent, removeEventPoster } from "../actions";
import { EventForm } from "../event-form";
import { PosterUpload } from "./poster-upload";

type Params = Promise<{ eventId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { eventId } = await params;
  const data = await getEventAdmin(eventId);
  return { title: data?.event.title ?? "Event" };
}

export default async function EventAdminPage({ params, searchParams }: { params: Params; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [, { eventId }, flash] = await Promise.all([requireAdmin(), params, searchParams]);
  const data = await getEventAdmin(eventId);
  if (!data) notFound();
  const { event, attendees } = data;
  const poster = posterUrl(event.poster_path);

  return (
    <>
      <Breadcrumbs items={[{ href: "/admin/events", label: "Events" }, { label: event.title }]} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">{event.title}</h1>
        <Link href={`/events/${event.slug}`} className={buttonClasses("ghost", "sm")} target="_blank">
          View on site ↗
        </Link>
      </div>
      <div className="mt-5">
        <Flash {...flash} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <h2 className="text-lg font-bold text-brand-900">Details</h2>
          <div className="mt-4">
            <EventForm event={event} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-bold text-brand-900">Poster</h2>
            {poster ? (
              <div className="mt-3">
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-slate-200 bg-brand-900">
                  <Image src={poster} alt="" fill sizes="340px" className="object-cover" />
                </div>
                <form action={removeEventPoster} className="mt-2">
                  <input type="hidden" name="id" value={event.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                    <Trash className="h-4 w-4" aria-hidden="true" />
                    Remove poster
                  </Button>
                </form>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No poster yet. PNG, JPEG or WebP, up to 5 MB, ideally 16:9.</p>
            )}
            <div className="mt-3">
              <PosterUpload eventId={event.id} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-brand-900">
                Attendees <span className="font-normal text-slate-500">({attendees.length})</span>
              </h2>
              {attendees.length > 0 && (
                <a href={`/admin/events/${event.id}/attendees.csv`} className={buttonClasses("secondary", "sm")}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export CSV
                </a>
              )}
            </div>
            {attendees.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nobody has registered yet.</p>
            ) : (
              <ul className="mt-3 max-h-96 divide-y divide-slate-100 overflow-y-auto text-sm">
                {attendees.map((a) => (
                  <li key={a.email} className="py-2">
                    <p className="font-medium text-slate-800">{a.fullName || a.email}</p>
                    <p className="text-xs text-slate-500">
                      {a.email}
                      {a.levelNumber ? ` · Level ${a.levelNumber}` : ""} · {formatDateTime(a.registeredAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="border-red-200">
            <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
            <form action={deleteEvent} className="mt-3">
              <input type="hidden" name="id" value={event.id} />
              <ConfirmButton variant="danger" size="sm" message={`Delete "${event.title}" and its ${attendees.length} registrations?`}>
                <Trash className="h-4 w-4" aria-hidden="true" />
                Delete event
              </ConfirmButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
