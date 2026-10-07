import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, CalendarPlus, Download, MapPin, MicVocal, Video } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Prose } from "@/components/prose";
import { Badge, ButtonLink, Container, buttonClasses } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { googleCalendarUrl } from "@/lib/calendar";
import { getEventBySlug } from "@/lib/events";
import { formatDate, formatTime } from "@/lib/format";
import { posterUrl } from "@/lib/queries";
import { RegisterPanel } from "./register-panel";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getEventBySlug(slug);
  return { title: detail?.event.title ?? "Event" };
}

export default async function EventPage({ params }: { params: Params }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const detail = await getEventBySlug(slug, user?.id);
  if (!detail) notFound();
  const { event, taken, isRegistered, isPast, isFull } = detail;
  const poster = posterUrl(event.poster_path);

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ href: "/events", label: "Events" }, { label: event.title }]} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <article>
          {poster && (
            <div className="relative aspect-[16/9] overflow-hidden rounded-card border border-slate-200 bg-brand-900">
              <Image src={poster} alt={`${event.title} poster`} fill sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" priority />
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {isPast && <Badge tone="neutral">Past event</Badge>}
            {event.status !== "published" && <Badge tone="neutral">{event.status}</Badge>}
            {isRegistered && !isPast && <Badge tone="success">You are registered</Badge>}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">{event.title}</h1>

          <dl className="mt-5 grid gap-3 text-slate-700 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
              <div>
                <dt className="text-sm text-slate-500">When</dt>
                <dd className="font-medium">
                  {formatDate(event.starts_at)}
                  <br />
                  {formatTime(event.starts_at)}
                  {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""} (Tashkent)
                </dd>
              </div>
            </div>
            {(event.location || event.online_link) && (
              <div className="flex items-start gap-3">
                {event.location ? (
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
                ) : (
                  <Video className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
                )}
                <div>
                  <dt className="text-sm text-slate-500">Where</dt>
                  <dd className="font-medium">
                    {event.location ?? "Online"}
                    {event.online_link &&
                      (isRegistered ? (
                        <a href={event.online_link} target="_blank" rel="noreferrer" className="mt-1 block text-brand-700 underline">
                          Join link
                        </a>
                      ) : (
                        <span className="mt-1 block text-sm font-normal text-slate-500">Join link is shown after you register</span>
                      ))}
                  </dd>
                </div>
              </div>
            )}
            {event.speaker && (
              <div className="flex items-start gap-3">
                <MicVocal className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
                <div>
                  <dt className="text-sm text-slate-500">Speaker</dt>
                  <dd className="font-medium">{event.speaker}</dd>
                </div>
              </div>
            )}
          </dl>

          <div className="mt-8">
            <Prose text={event.description} />
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
            {isPast ? (
              <p className="text-sm text-slate-600">This event has already taken place. {taken > 0 && `${taken} students attended.`}</p>
            ) : user ? (
              <RegisterPanel
                eventId={event.id}
                slug={event.slug}
                isRegistered={isRegistered}
                isFull={isFull}
                taken={taken}
                capacity={event.capacity}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  {event.capacity === null
                    ? "Open to all WIUT students."
                    : `${Math.max(event.capacity - taken, 0)} of ${event.capacity} places left.`}
                </p>
                <ButtonLink href={`/login?next=/events/${event.slug}`} variant="accent" size="lg" className="w-full">
                  Log in to register
                </ButtonLink>
                <p className="text-center text-sm text-slate-500">
                  New here?{" "}
                  <a href="/signup" className="font-medium text-brand-700 hover:underline">
                    Join the society
                  </a>
                </p>
              </div>
            )}
          </div>

          {!isPast && (
            <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-sm font-semibold text-slate-900">Add to calendar</h2>
              <div className="mt-3 flex flex-col gap-2">
                <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" className={buttonClasses("secondary", "sm")}>
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  Google Calendar
                </a>
                <a href={`/events/${event.slug}/calendar.ics`} className={buttonClasses("secondary", "sm")}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download .ics (Apple, Outlook)
                </a>
              </div>
            </div>
          )}
        </aside>
      </div>
    </Container>
  );
}
