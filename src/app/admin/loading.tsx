/** Instant placeholder for admin pages while their data loads. */
export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-8 w-1/2 max-w-sm rounded bg-slate-200" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-card border border-slate-200 bg-white" />
        ))}
      </div>
    </div>
  );
}
