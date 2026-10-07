import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { Badge, buttonClasses } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { AdminNav } from "./_components/admin-nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · WIUT Finance Society" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/admin" compact />
            <Badge tone="brand">{user.profile.role === "admin" ? "Admin" : "Editor"}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-500 sm:block">{user.profile.full_name || user.email}</span>
            <Link href="/" className={buttonClasses("ghost", "sm")}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">View site</span>
            </Link>
            <form action={signOut}>
              <button type="submit" className={buttonClasses("ghost", "sm", "px-2")} aria-label="Log out" title="Log out">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-8">
        <AdminNav role={user.profile.role} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
