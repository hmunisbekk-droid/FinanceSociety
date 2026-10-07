import { getEventAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

function cell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Attendee list as a CSV that opens cleanly in Excel (FR-32). */
export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { eventId } = await params;
  const data = await getEventAdmin(eventId);
  if (!data) return new Response("Not found", { status: 404 });

  const rows = [
    ["Name", "Email", "Programme", "Level", "Registered at"],
    ...data.attendees.map((a) => [a.fullName, a.email, a.programme ?? "", a.levelNumber ? `Level ${a.levelNumber}` : "", formatDateTime(a.registeredAt)]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${data.event.slug}-attendees.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
