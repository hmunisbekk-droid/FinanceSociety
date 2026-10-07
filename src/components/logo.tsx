import Link from "next/link";

/**
 * Placeholder brand mark: rising bars with a trend arrow on a navy tile.
 * Replace with the club's real logo when it arrives.
 */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="12" fill="#0b1f3a" />
      <rect x="9" y="30" width="7" height="9" rx="1.5" fill="#c9a227" />
      <rect x="20.5" y="24" width="7" height="15" rx="1.5" fill="#c9a227" />
      <rect x="32" y="18" width="7" height="21" rx="1.5" fill="#c9a227" />
      <path
        d="M9 22.5 L19 16.5 L27 19.5 L38.5 10.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32.5 9.5 H39.5 V16.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-md" aria-label="WIUT Finance Society home">
      <LogoMark className={compact ? "h-8 w-8" : "h-9 w-9"} />
      <span className="leading-none">
        <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-accent-600">
          WIUT
        </span>
        <span className="mt-0.5 block text-[1.0625rem] font-bold tracking-tight text-brand-900">
          Finance Society
        </span>
      </span>
    </Link>
  );
}
