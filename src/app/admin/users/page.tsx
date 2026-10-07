import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge, Button, Card, Input, PageHeader, Select, buttonClasses } from "@/components/ui";
import { getUsersAdmin } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Flash } from "../_components/flash";
import { setUserBlocked, updateUserRole } from "./actions";

export const metadata: Metadata = { title: "Users" };

const ROLES = [
  { value: "student", label: "Student" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

export default async function UsersAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string }> }) {
  const [me, { ok, error, q }] = await Promise.all([requireAdmin(), searchParams]);
  const users = await getUsersAdmin(q);

  return (
    <>
      <PageHeader eyebrow="Users" title="Users and roles" description="Students register themselves. Make a club member an editor and assign their subjects, or block an account." />
      <div className="mt-6">
        <Flash ok={ok} error={error} />
      </div>

      <form method="get" className="mb-4 flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by name or email" aria-label="Search users" className="max-w-sm" />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </Button>
      </form>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-3 py-3 font-semibold">Level</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Subjects</th>
                <th className="px-3 py-3 font-semibold">Joined</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
              {users.map((user) => {
                const isMe = user.id === me.id;
                return (
                  <tr key={user.id} className={user.is_blocked ? "bg-red-50/40" : ""}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">
                        {user.full_name || "—"} {isMe && <span className="text-xs text-slate-400">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {user.email}
                        {user.programme ? ` · ${user.programme}` : ""}
                      </p>
                      {user.is_blocked && (
                        <Badge tone="danger" className="mt-1">
                          Blocked
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">{user.levelNumber ? `Level ${user.levelNumber}` : "—"}</td>
                    <td className="px-3 py-3">
                      <form action={updateUserRole} className="flex items-center gap-1.5">
                        <input type="hidden" name="userId" value={user.id} />
                        {q && <input type="hidden" name="q" value={q} />}
                        <div className="w-28 shrink-0">
                          <Select name="role" defaultValue={user.role} aria-label={`Role for ${user.full_name || user.email}`} className="py-1.5 text-sm" disabled={isMe}>
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                        {!isMe && (
                          <Button type="submit" variant="ghost" size="sm">
                            Save
                          </Button>
                        )}
                      </form>
                    </td>
                    <td className="px-3 py-3">
                      {user.role === "editor" || user.role === "admin" ? (
                        <Link href={`/admin/users/${user.id}`} className="text-brand-700 hover:underline">
                          {user.editorSubjects.length === 0 ? "Assign subjects" : `${user.editorSubjects.length} assigned`}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                    <td className="px-3 py-3 text-right">
                      {!isMe && (
                        <form action={setUserBlocked}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="blocked" value={user.is_blocked ? "false" : "true"} />
                          {q && <input type="hidden" name="q" value={q} />}
                          <button type="submit" className={buttonClasses(user.is_blocked ? "secondary" : "ghost", "sm", user.is_blocked ? "" : "text-red-600")}>
                            {user.is_blocked ? "Unblock" : "Block"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
