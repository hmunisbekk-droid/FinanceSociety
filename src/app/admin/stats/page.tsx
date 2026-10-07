import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { getAdminStats } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Statistics" };

export default async function StatsPage() {
  await requireAdmin();
  const stats = await getAdminStats();

  if (!stats) {
    return (
      <>
        <PageHeader eyebrow="Statistics" title="Site statistics" />
        <p className="mt-6 text-sm text-slate-500">Statistics are not available right now.</p>
      </>
    );
  }

  const tiles = [
    { label: "Registered users", value: stats.registered },
    { label: "Active in the last 7 days", value: stats.active_week },
    { label: "Published topics", value: stats.published_topics },
    { label: "Published topics with a quiz", value: stats.topics_with_quiz },
    { label: "Event registrations", value: stats.event_registrations },
  ];

  return (
    <>
      <PageHeader eyebrow="Statistics" title="Site statistics" description="Counts are live. Views cover the last 30 days; activity covers the last 7." />

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <dt className="text-sm text-slate-500">{tile.label}</dt>
            <dd className="mt-1 text-3xl font-bold text-brand-900">{tile.value}</dd>
          </Card>
        ))}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold text-brand-900">Most viewed topics</h2>
          {stats.most_viewed.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No views recorded yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-semibold">Topic</th>
                  <th className="px-3 py-2 text-right font-semibold">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.most_viewed.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-slate-800">{row.title}</p>
                      <p className="text-xs text-slate-500">{row.subject}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-brand-900">{row.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-0">
          <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold text-brand-900">Average quiz score per topic</h2>
          {stats.quiz_averages.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No quiz attempts yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-semibold">Topic</th>
                  <th className="px-3 py-2 text-right font-semibold">Attempts</th>
                  <th className="px-3 py-2 text-right font-semibold">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.quiz_averages.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-slate-800">{row.title}</p>
                      <p className="text-xs text-slate-500">{row.subject}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{row.attempts}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-brand-900">{row.avg_percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
