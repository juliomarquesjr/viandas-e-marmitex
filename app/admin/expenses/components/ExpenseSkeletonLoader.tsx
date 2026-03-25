"use client";

import { Card, CardContent } from "@/app/components/ui/card";

export function ExpenseListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-slate-200 rounded-xl bg-white shadow-card border-t-4 border-t-slate-200 p-5 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-7 bg-slate-200 rounded w-16" />
                <div className="h-3 bg-slate-200 rounded w-28" />
              </div>
              <div className="h-11 w-11 bg-slate-200 rounded-xl ml-3" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <Card>
        <CardContent className="p-4 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 bg-slate-200 rounded w-16" />
                <div className="h-10 bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex gap-2">
              <div className="h-8 w-24 bg-slate-200 rounded-lg" />
            </div>
            <div className="h-6 w-36 bg-slate-200 rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card className="overflow-hidden animate-pulse">
        {/* Month header */}
        <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-200 rounded-lg" />
              <div className="space-y-1.5">
                <div className="h-4 bg-slate-200 rounded w-32" />
                <div className="h-3 bg-slate-200 rounded w-24" />
              </div>
            </div>
            <div className="text-right space-y-1.5">
              <div className="h-3 bg-slate-200 rounded w-20 ml-auto" />
              <div className="h-6 bg-slate-200 rounded w-28 ml-auto" />
            </div>
          </div>
        </div>

        {/* Table header */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3">
          <div className="grid grid-cols-7 gap-4">
            {[48, 20, 24, 20, 16, 16, 12].map((w, i) => (
              <div key={i} className={`h-3 bg-slate-200 rounded w-${w}`} style={{ width: `${w * 4}px` }} />
            ))}
          </div>
        </div>

        {/* Table rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-4">
              <div className="flex-1 flex items-center gap-3">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
              </div>
              <div className="w-24 h-6 bg-slate-200 rounded-full" />
              <div className="w-24 h-6 bg-slate-200 rounded-full" />
              <div className="w-24 h-6 bg-slate-200 rounded-full" />
              <div className="w-20 h-6 bg-slate-200 rounded-full" />
              <div className="w-20 h-4 bg-slate-200 rounded" />
              <div className="w-8 h-8 bg-slate-200 rounded-lg" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function ExpenseCalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-slate-200 rounded-xl bg-white shadow-card border-t-4 border-t-slate-200 p-5 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-7 bg-slate-200 rounded w-16" />
                <div className="h-3 bg-slate-200 rounded w-28" />
              </div>
              <div className="h-11 w-11 bg-slate-200 rounded-xl ml-3" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <Card>
        <CardContent className="p-4 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-200 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Skeleton */}
      <Card className="overflow-hidden animate-pulse">
        {/* Calendar header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="h-7 bg-slate-200 rounded w-44" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-slate-200 rounded-lg" />
              <div className="h-8 w-16 bg-slate-200 rounded-lg" />
              <div className="h-8 w-8 bg-slate-200 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="py-2 flex justify-center">
                <div className="h-3 bg-slate-200 rounded w-8" />
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="min-h-28 rounded-xl bg-slate-100 border border-slate-100 p-2 space-y-1.5">
                <div className="h-6 w-6 bg-slate-200 rounded-full" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
