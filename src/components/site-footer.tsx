import Link from "next/link";
import { Camera, Mail, Send } from "lucide-react";
import { Logo } from "@/components/logo";
import { site } from "@/lib/site";

const SITE_LINKS = [
  { href: "/learn", label: "Learning Hub" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About the club" },
  { href: "/privacy", label: "Privacy notice" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-slate-600">{site.tagline}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <a href={`mailto:${site.contactEmail}`} className="inline-flex items-center gap-2 hover:text-brand-800">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {site.contactEmail}
              </a>
            </li>
            <li>
              <a href={site.links.telegram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-brand-800">
                <Send className="h-4 w-4" aria-hidden="true" />
                Telegram channel
              </a>
            </li>
            <li>
              <a href={site.links.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-brand-800">
                <Camera className="h-4 w-4" aria-hidden="true" />
                Instagram
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">Site</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {SITE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-brand-800">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 sm:px-6">
          © {new Date().getFullYear()} {site.name}. A student society at {site.university}.
        </p>
      </div>
    </footer>
  );
}
