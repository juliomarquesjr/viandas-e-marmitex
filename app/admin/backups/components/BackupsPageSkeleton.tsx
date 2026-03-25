export function BackupsPageSkeleton() {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex"
      style={{ minHeight: 580 }}
    >
      {/* Sidebar skeleton */}
      <div className="w-52 flex-shrink-0 border-r border-slate-200 bg-slate-100/70 p-2 space-y-1 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="h-7 w-7 rounded-lg bg-slate-200 flex-shrink-0" />
            <div className="min-w-0 space-y-1 flex-1">
              <div className="h-3 bg-slate-200 rounded w-24" />
              <div className="h-2 bg-slate-200 rounded w-32" />
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Section header */}
        <div className="px-8 py-4 border-b border-slate-100 bg-white flex-shrink-0 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-200 flex-shrink-0" />
            <div className="space-y-2">
              <div className="h-3 bg-slate-200 rounded w-32" />
              <div className="h-2 bg-slate-200 rounded w-64" />
            </div>
          </div>
        </div>

        {/* Rows skeleton */}
        <div className="flex-1 divide-y divide-slate-100 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-8 px-8 py-5">
              <div className="w-48 flex-shrink-0 space-y-2 pt-1">
                <div className="h-3 bg-slate-200 rounded w-28" />
                <div className="h-2 bg-slate-200 rounded w-36" />
              </div>
              <div className="flex-1">
                <div className="h-8 bg-slate-200 rounded-lg w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
