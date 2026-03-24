"use client";

import { Card } from "@/app/components/ui/card";

export function OrderPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="border border-slate-200 rounded-xl bg-white shadow-card border-t-4 border-t-slate-200 p-5 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-7 bg-slate-200 rounded w-20" />
                <div className="h-3 bg-slate-200 rounded w-28" />
              </div>
              <div className="h-11 w-11 bg-slate-200 rounded-xl ml-3" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden animate-pulse">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 bg-slate-200 rounded-lg" />
            <div className="h-3 bg-slate-200 rounded w-28" />
          </div>
          <div className="h-3 bg-slate-200 rounded w-20" />
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-2.5 p-3">
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 bg-slate-200 rounded w-24" />
            <div className="h-10 bg-slate-200 rounded-lg" />
          </div>
          <div className="space-y-1.5 shrink-0 w-full lg:w-[180px]">
            <div className="h-2.5 bg-slate-200 rounded w-20" />
            <div className="h-10 bg-slate-200 rounded-lg" />
          </div>
          <div className="space-y-1.5 shrink-0 w-full lg:w-[180px]">
            <div className="h-2.5 bg-slate-200 rounded w-16" />
            <div className="h-10 bg-slate-200 rounded-lg" />
          </div>
          <div className="hidden lg:block w-px h-10 bg-slate-200 shrink-0" />
          <div className="h-10 w-full lg:w-28 bg-slate-200 rounded-lg shrink-0" />
        </div>
      </div>

      <Card className="overflow-hidden animate-pulse">
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3">
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-32" />
            <div className="h-3 bg-slate-200 rounded w-48" />
          </div>
        </div>

        <div className="p-5">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_48px] gap-4 items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-200 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-slate-200 rounded w-32" />
                    <div className="h-3 bg-slate-200 rounded w-24" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-20" />
                  <div className="h-3 bg-slate-200 rounded w-16" />
                </div>
                <div className="h-3 bg-slate-200 rounded w-28" />
                <div className="h-6 bg-slate-200 rounded-full w-20" />
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-24" />
                  <div className="h-3 bg-slate-200 rounded w-16" />
                </div>
                <div className="h-8 w-8 bg-slate-200 rounded-lg justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
