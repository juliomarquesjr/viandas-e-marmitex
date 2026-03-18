 "use client";

import { Card, CardContent } from "@/app/components/ui/card";

export function UsersPageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="border border-slate-200 rounded-xl bg-white shadow-card border-t-4 border-t-slate-200 p-5 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-7 bg-slate-200 rounded w-20" />
                <div className="h-3 bg-slate-200 rounded w-32" />
              </div>
              <div className="h-11 w-11 bg-slate-200 rounded-xl ml-3" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <Card>
        <CardContent className="p-4 animate-pulse">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative w-full max-w-md space-y-2">
              <div className="h-3 bg-slate-200 rounded w-32" />
              <div className="h-10 bg-slate-200 rounded-lg" />
            </div>

            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <div className="space-y-2 w-36">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-10 bg-slate-200 rounded-lg" />
              </div>
              <div className="space-y-2 w-32">
                <div className="h-3 bg-slate-200 rounded w-20" />
                <div className="h-10 bg-slate-200 rounded-lg" />
              </div>
              <div className="space-y-2 w-24">
                <div className="h-3 bg-slate-200 rounded w-16" />
                <div className="h-9 bg-slate-200 rounded-lg" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card className="overflow-hidden animate-pulse">
        {/* Table header */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3">
          <div className="grid grid-cols-6 gap-4">
            {[28, 28, 18, 22, 14, 8].map((w, i) => (
              <div
                key={i}
                className="h-3 bg-slate-200 rounded"
                style={{ width: `${w * 4}px` }}
              />
            ))}
          </div>
        </div>

        {/* Table rows */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="px-5 py-4 border-b border-slate-50 last:border-0"
          >
            <div className="grid grid-cols-6 gap-4 items-center">
              {/* Usuário */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-slate-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-slate-200 rounded w-32" />
                  <div className="h-3 bg-slate-200 rounded w-24" />
                </div>
              </div>

              {/* Contato */}
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-40" />
                <div className="h-3 bg-slate-200 rounded w-28" />
              </div>

              {/* Perfil */}
              <div className="h-6 bg-slate-200 rounded-full w-24 justify-self-center" />

              {/* Reconhecimento Facial */}
              <div className="h-6 bg-slate-200 rounded-full w-28 justify-self-center" />

              {/* Status */}
              <div className="h-6 bg-slate-200 rounded-full w-20 justify-self-center" />

              {/* Ações */}
              <div className="h-8 w-8 bg-slate-200 rounded-lg justify-self-end" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

