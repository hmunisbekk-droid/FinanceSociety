import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, ClipboardCheck, Users } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { getAdminStats, getContentTree } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { StatusBadge } from "./_components/status-badge";

export default async function AdminHomePage() {
  const user = await requireStaff();
  const isAdmin = user.profile.role === "admin";
  const [stats, tree] = await Promise.all([isAdmin ? getAdminStats() : Promise.resolve(null), getContentTree()]);

  const mySubjects = tree.flatMap((level) => level.subjects.map((s) => ({ ...s, levelName: level.name })));

  return (
    <>
      <PageHeader eyebrow="Admin panel" title={`Hello, ${user.profile.full_name.split(" ")[0] || "there"}`} />

      {isAdmin && stats && (
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Registered students", value: stats.registered, icon: Users },
            { label: "Active this week", value: stats.active_week, icon: BookOpen },
            { label: "Published topics with a quiz", value: stats.topics_with_quiz, icon: ClipboardCheck },
            { label: "Event registrations", value: stats.event_registrations, icon: CalendarDays },
          ].map((item) => (
            <Card key={item.label} className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="text-sm text-slate-500">{item.label}</dt>
                <dd className="text-2xl font-bold text-brand-900">{item.value}</dd>
              </div>
            </Card>
          ))}
        </dl>
      )}

      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold text-brand-900">{isAdmin ? "Subjects" : "Your subjects"}</h2>
          <Link href="/admin/content" className="text-sm font-medium text-brand-700 hover:underline">
            Manage content →
          </Link>
        </div>
        {mySubjects.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            {isAdmin ? "No subjects yet." : "You have not been assigned any subjects yet. Ask an admin."}
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mySubjects.map((subject) => (
              <li key={subject.id}>
                <Link
                  href={`/admin/content/subjects/${subject.id}`}
                  className="group flex h-full flex-col rounded-card border border-slate-200 bg-white p-4 shadow-card transition-colors hover:border-brand-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-brand-900 group-hover:text-brand-700">{subject.name}</span>
                    <StatusBadge status={subject.status} />
                  </div>
                  <span className="mt-1 text-sm text-slate-500">
                    {subject.levelName} · {subject.topicCount} {subject.topicCount === 1 ? "topic" : "topics"}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                    Open <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
