import { Container } from "@/components/ui";

/** Shown instantly while a page's data loads, so navigation never feels stuck. */
export default function SiteLoading() {
  return (
    <Container className="animate-pulse py-10 sm:py-14" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="mt-4 h-9 w-2/3 max-w-md rounded bg-slate-200" />
      <div className="mt-3 h-4 w-1/2 max-w-sm rounded bg-slate-200" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-card border border-slate-200 bg-white" />
        ))}
      </div>
    </Container>
  );
}
