import type { SiteEvent } from "@/lib/types";
import { siteUrl } from "@/lib/site";

/** 2026-10-16T14:00:00.000Z → 20261016T140000Z */
function stamp(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function endOf(event: SiteEvent) {
  return event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 90 * 60 * 1000).toISOString();
}

function location(event: SiteEvent) {
  return event.location ?? (event.online_link ? "Online" : "");
}

/** Link that opens Google Calendar with the event pre-filled (FR-31). */
export function googleCalendarUrl(event: SiteEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(event.starts_at)}/${stamp(endOf(event))}`,
    details: `${event.description}\n\n${siteUrl()}/events/${event.slug}`,
    location: location(event),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcs(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** .ics file contents for Apple Calendar, Outlook and others (FR-31). */
export function buildIcs(event: SiteEvent) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WIUT Finance Society//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@financesociety`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.starts_at)}`,
    `DTEND:${stamp(endOf(event))}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(location(event))}`,
    `URL:${siteUrl()}/events/${event.slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
