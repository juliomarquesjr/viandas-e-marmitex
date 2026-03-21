"use client";

import { Card, CardContent } from "@/app/components/ui/card";

export function ProductPageSkeleton() {
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden animate-pulse">
        {/* Header strip */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 bg-slate-200 rounded-lg" />
            <div className="h-3 bg-slate-200 rounded w-28" />
          </div>
          <div className="h-3 bg-slate-200 rounded w-20" />
        </div>
        {/* Controls row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 p-3">
          {/* Search */}
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 bg-slate-200 rounded w-24" />
            <div className="h-10 bg-slate-200 rounded-lg" />
          </div>
          {/* Status select */}
          <div className="space-y-1.5 shrink-0 w-full sm:w-[160px]">
            <div className="h-2.5 bg-slate-200 rounded w-12" />
            <div className="h-10 bg-slate-200 rounded-md" />
          </div>
          {/* Type select */}
          <div className="space-y-1.5 shrink-0 w-full sm:w-[160px]">
            <div className="h-2.5 bg-slate-200 rounded w-10" />
            <div className="h-10 bg-slate-200 rounded-md" />
          </div>
          {/* Separator */}
          <div className="hidden sm:block w-px h-10 bg-slate-200 shrink-0" />
          {/* View toggle */}
          <div className="h-10 w-20 bg-slate-200 rounded-lg shrink-0 self-center sm:self-auto" />
        </div>
      </div>

      {/* Table Skeleton */}
      <Card className="overflow-hidden animate-pulse">
        {/* Table header */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3">
          <div className="grid grid-cols-6 gap-4">
            {[32, 20, 20, 16, 16, 10].map((w, i) => (
              <div key={i} className="h-3 bg-slate-200 rounded" style={{ width: `${w * 4}px` }} />
            ))}
          </div>
        </div>

        {/* Table rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-slate-50 last:border-0">
            <div className="grid grid-cols-6 gap-4 items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-200 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-slate-200 rounded w-32" />
                  <div className="h-3 bg-slate-200 rounded w-24" />
                </div>
              </div>
              <div className="h-3 bg-slate-200 rounded w-24" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-20" />
                <div className="h-3 bg-slate-200 rounded w-16" />
              </div>
              <div className="h-3 bg-slate-200 rounded w-12" />
              <div className="h-6 bg-slate-200 rounded-full w-16" />
              <div className="h-8 w-8 bg-slate-200 rounded-lg justify-self-end" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

