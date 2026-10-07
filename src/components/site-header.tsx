"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { signOut } from "@/app/(auth)/actions";
import type { Role } from "@/lib/types";

export interface HeaderUser {
  name: string;
  role: Role;
}

const NAV = [
  { href: "/learn", label: "Learning Hub" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]!.toUpperCase());
  return letters.join("") || "S";
}

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isStaff = user?.role === "editor" || user?.role === "admin";
  const items = isStaff ? [...NAV, { href: "/admin", label: "Admin" }] : NAV;

  const navLink = (href: string, label: string, mobile = false) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      // Close the phone menu when a link is chosen.
      onClick={mobile ? () => setOpen(false) : undefined}
      className={cn(
        "rounded-md font-medium transition-colors",
        mobile ? "block px-3 py-2.5 text-base" : "px-3 py-2 text-sm",
        isActive(href) ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {items.map((item) => navLink(item.href, item.label))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/search" className={buttonClasses("ghost", "sm", "px-2")} aria-label="Search" title="Search">
            <Search className="h-4 w-4" aria-hidden="true" />
          </Link>
          {user ? (
            <>
              <Link href="/my" className={buttonClasses("secondary", "sm")}>
                My learning
              </Link>
              <Link
                href="/account"
                title="Account"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800 hover:bg-brand-200"
              >
                <span className="sr-only">Account: </span>
                {initialsOf(user.name)}
              </Link>
              <form action={signOut}>
                <button type="submit" className={buttonClasses("ghost", "sm", "px-2")} aria-label="Log out" title="Log out">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClasses("ghost", "sm")}>
                Log in
              </Link>
              <Link href="/signup" className={buttonClasses("primary", "sm")}>
                Join
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-slate-200 bg-white md:hidden">
          <nav className="space-y-1 px-4 py-3" aria-label="Main">
            {items.map((item) => navLink(item.href, item.label, true))}
            {navLink("/search", "Search", true)}
          </nav>
          <div className="border-t border-slate-200 px-4 py-3">
            {user ? (
              <div className="space-y-1">
                <p className="px-3 py-1 text-sm text-slate-500">Logged in as {user.name}</p>
                {navLink("/my", "My learning", true)}
                {navLink("/account", "Account", true)}
                <form action={signOut}>
                  <button
                    type="submit"
                    className="block w-full rounded-md px-3 py-2.5 text-left text-base font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Log out
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className={buttonClasses("secondary", "md", "flex-1")}>
                  Log in
                </Link>
                <Link href="/signup" className={buttonClasses("primary", "md", "flex-1")}>
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
