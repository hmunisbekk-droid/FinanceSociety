import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button, Card } from "@/components/ui";
import { getUserAdmin } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { Flash } from "../../_components/flash";
import { setEditorSubjects } from "../actions";

export const metadata: Metadata = { title: "Assign subjects" };

export default async function UserAdminPage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [, { userId }, flash] = await Promise.all([requireAdmin(), params, searchParams]);
  const data = await getUserAdmin(userId);
  if (!data) notFound();
  const { profile, assignedIds, tree } = data;

  return (
    <>
      <Breadcrumbs items={[{ href: "/admin/users", label: "Users" }, { label: profile.full_name || profile.email }]} />
      <h1 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">{profile.full_name || profile.email}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {profile.email} · {profile.role}
      </p>
      <div className="mt-5">
        <Flash {...flash} />
      </div>

      <Card>
        <h2 className="text-lg font-bold text-brand-900">Subjects this person can edit</h2>
        <p className="mt-1 text-sm text-slate-600">
          Editors create and edit topics, materials and quizzes in their subjects and submit them for review. Admins can edit everything regardless.
        </p>
        <form action={setEditorSubjects} className="mt-4 space-y-5">
          <input type="hidden" name="userId" value={profile.id} />
          {tree.map((level) => (
            <fieldset key={level.id}>
              <legend className="text-sm font-semibold text-slate-900">{level.name}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {level.subjects.map((subject) => (
                  <label key={subject.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" name="subjects" value={subject.id} defaultChecked={assignedIds.has(subject.id)} className="h-4 w-4 accent-brand-700" />
                    {subject.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <Button type="submit">Save assignments</Button>
        </form>
      </Card>
    </>
  );
}
