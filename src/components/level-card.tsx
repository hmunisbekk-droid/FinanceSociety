import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { LevelWithCount } from "@/lib/queries";

export function LevelCard({ level, isMine = false }: { level: LevelWithCount; isMine?: boolean }) {
  return (
    <Link
      href={`/learn/${level.number}`}
      className={cn(
        "group flex flex-col rounded-card border bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg",
        isMine ? "border-accent-400 ring-2 ring-accent-200" : "border-slate-200 hover:border-brand-300",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">{level.study_year}</p>
          <h3 className="mt-1 text-2xl font-bold text-brand-900">{level.name}</h3>
        </div>
        {isMine && <Badge tone="accent">Your level</Badge>}
      </div>
      <p className="mt-3 flex-1 text-sm text-slate-600">{level.description}</p>
      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="text-slate-500">
          {level.subjectCount} {level.subjectCount === 1 ? "subject" : "subjects"}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-brand-700 group-hover:gap-2 transition-all">
          Open <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
