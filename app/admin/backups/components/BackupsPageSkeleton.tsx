export function BackupsPageSkeleton() {
  return (
    <div
      className="flex overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]"
      style={{ minHeight: 580 }}
    >
      {/* Sidebar skeleton */}
      <div className="w-52 flex-shrink-0 space-y-1 border-r border-[color:var(--border)] bg-[color:var(--muted)]/60 p-2 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="h-7 w-7 rounded-lg bg-[color:var(--accent)] flex-shrink-0" />
            <div className="min-w-0 space-y-1 flex-1">
              <div className="h-3 w-24 rounded bg-[color:var(--accent)]" />
              <div className="h-2 w-32 rounded bg-[color:var(--accent)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Section header */}
        <div className="flex-shrink-0 border-b border-[color:var(--border)] bg-[color:var(--card)] px-8 py-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[color:var(--accent)] flex-shrink-0" />
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-[color:var(--accent)]" />
              <div className="h-2 w-64 rounded bg-[color:var(--accent)]" />
            </div>
          </div>
        </div>

        {/* Rows skeleton */}
        <div className="flex-1 divide-y divide-[color:var(--border)] animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-8 px-8 py-5">
              <div className="w-48 flex-shrink-0 space-y-2 pt-1">
                <div className="h-3 w-28 rounded bg-[color:var(--accent)]" />
                <div className="h-2 w-36 rounded bg-[color:var(--accent)]" />
              </div>
              <div className="flex-1">
                <div className="h-8 w-32 rounded-lg bg-[color:var(--accent)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
