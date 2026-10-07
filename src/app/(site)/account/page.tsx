import type { Metadata } from "next";
import { Badge, Card, Container, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLevelsWithCounts } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { PasswordForm, ProfileForm } from "./account-forms";

export const metadata: Metadata = { title: "Account" };

const ROLE_LABELS = { student: "Student", editor: "Content editor", admin: "Admin" } as const;

export default async function AccountPage() {
  const [user, levels] = await Promise.all([requireUser("/account"), getLevelsWithCounts()]);

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <PageHeader eyebrow="Account" title="Your profile" />

      <Card className="mt-8">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="mt-0.5">
              <Badge tone={user.profile.role === "student" ? "neutral" : "brand"}>{ROLE_LABELS[user.profile.role]}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Member since</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDate(user.profile.created_at)}</dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-bold text-brand-900">Details</h2>
        <div className="mt-4">
          <ProfileForm
            fullName={user.profile.full_name}
            programme={user.profile.programme ?? ""}
            levelId={user.profile.level_id ?? ""}
            levels={levels.map((l) => ({ id: l.id, number: l.number, label: `${l.name} · ${l.study_year}` }))}
          />
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-bold text-brand-900">Password</h2>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </Card>
    </Container>
  );
}
