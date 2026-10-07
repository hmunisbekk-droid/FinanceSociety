import { buildIcs } from "@/lib/calendar";
import { getEventBySlug } from "@/lib/events";

/** Downloadable calendar file for an event (FR-31). */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getEventBySlug(slug);
  if (!detail) return new Response("Not found", { status: 404 });

  return new Response(buildIcs(detail.event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
