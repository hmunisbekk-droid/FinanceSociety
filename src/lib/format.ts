import { site } from "./site";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: site.timeZone,
});

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: site.timeZone,
});

const timeOnly = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: site.timeZone,
});

/** "Tue, 14 Oct, 17:30" — Tashkent time. */
export function formatDateTime(iso: string) {
  return dateTime.format(new Date(iso));
}

/** "14 October 2026" */
export function formatDate(iso: string) {
  return dateOnly.format(new Date(iso));
}

/** "17:30" */
export function formatTime(iso: string) {
  return timeOnly.format(new Date(iso));
}

/** "2.4 MB" */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "87%" */
export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}
