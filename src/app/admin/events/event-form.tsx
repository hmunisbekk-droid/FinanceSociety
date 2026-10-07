import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/admin";
import { toLocalInput } from "@/lib/format";
import type { ContentStatus, SiteEvent } from "@/lib/types";
import { saveEvent } from "./actions";

/** Shared create / edit form. All times are entered in Tashkent time. */
export function EventForm({ event }: { event: SiteEvent | null }) {
  return (
    <form action={saveEvent} className="space-y-4">
      {event && <input type="hidden" name="id" value={event.id} />}

      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label="Title" htmlFor="title">
          <Input id="title" name="title" defaultValue={event?.title ?? ""} required minLength={2} />
        </Field>
        <Field label="Status" htmlFor="status" hint="Students only see published events">
          <Select id="status" name="status" defaultValue={event?.status ?? "draft"}>
            {(Object.keys(STATUS_LABELS) as ContentStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts (Tashkent time)" htmlFor="starts_at">
          <Input id="starts_at" name="starts_at" type="datetime-local" defaultValue={toLocalInput(event?.starts_at ?? null)} required />
        </Field>
        <Field label="Ends (optional)" htmlFor="ends_at">
          <Input id="ends_at" name="ends_at" type="datetime-local" defaultValue={toLocalInput(event?.ends_at ?? null)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Place" htmlFor="location" hint="e.g. WIUT, Room 3A-12. Leave empty for online events.">
          <Input id="location" name="location" defaultValue={event?.location ?? ""} />
        </Field>
        <Field label="Online link" htmlFor="online_link" hint="Shown only to registered students">
          <Input id="online_link" name="online_link" type="url" defaultValue={event?.online_link ?? ""} placeholder="https://meet.google.com/…" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <Field label="Speaker" htmlFor="speaker">
          <Input id="speaker" name="speaker" defaultValue={event?.speaker ?? ""} />
        </Field>
        <Field label="Capacity" htmlFor="capacity" hint="Empty = unlimited">
          <Input id="capacity" name="capacity" type="number" min={1} defaultValue={event?.capacity ?? ""} />
        </Field>
      </div>

      <Field label="Description" htmlFor="description" hint="Blank lines start new paragraphs">
        <Textarea id="description" name="description" defaultValue={event?.description ?? ""} className="min-h-32" />
      </Field>

      <Field label="Slug (web address)" htmlFor="slug" hint="Leave empty to generate from the title">
        <Input id="slug" name="slug" defaultValue={event?.slug ?? ""} />
      </Field>

      <Button type="submit">{event ? "Save event" : "Create event"}</Button>
    </form>
  );
}
