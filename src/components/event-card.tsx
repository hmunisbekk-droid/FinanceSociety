import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, MicVocal, Video } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { posterUrl } from "@/lib/queries";
import type { SiteEvent } from "@/lib/types";

export function EventCard({ event }: { event: SiteEvent }) {
  const poster = posterUrl(event.poster_path);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] bg-brand-900">
        {poster ? (
          <Image src={poster} alt="" fill sizes="(min-width: 1024px) 360px, 100vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-accent-400">
            <CalendarDays className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm font-semibold text-accent-600">{formatDateTime(event.starts_at)}</p>
        <h3 className="mt-1 text-lg font-bold text-brand-900 group-hover:text-brand-700">{event.title}</h3>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {event.location && (
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              {event.location}
            </li>
          )}
          {!event.location && event.online_link && (
            <li className="flex items-center gap-2">
              <Video className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              Online
            </li>
          )}
          {event.speaker && (
            <li className="flex items-center gap-2">
              <MicVocal className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              {event.speaker}
            </li>
          )}
        </ul>
      </div>
    </Link>
  );
}
