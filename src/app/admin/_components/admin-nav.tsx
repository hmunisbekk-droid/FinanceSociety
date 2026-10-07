"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartBar, FolderTree, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/types";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true, adminOnly: false },
  { href: "/admin/content", label: "Content", icon: FolderTree, exact: false, adminOnly: false },
  { href: "/admin/events", label: "Events", icon: CalendarDays, exact: false, adminOnly: true },
  { href: "/admin/users", label: "Users", icon: Users, exact: false, adminOnly: true },
  { href: "/admin/stats", label: "Statistics", icon: ChartBar, exact: false, adminOnly: true },
];

export function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => !item.adminOnly || role === "admin");

  return (
    <nav aria-label="Admin" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:w-52 md:shrink-0 md:overflow-visible md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand-800 text-white" : "text-slate-600 hover:bg-white hover:text-slate-900",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
