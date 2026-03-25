 "use client";

import { Card, CardContent } from "@/app/components/ui/card";

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Painel principal */}
      <Card className="border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex" style={{ minHeight: 580 }}>
          {/* Sidebar skeleton */}
          <div className="w-52 flex-shrink-0 border-r border-slate-200 bg-slate-100/70 p-2 space-y-1 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
              >
                <div className="h-7 w-7 rounded-lg bg-slate-200 flex-shrink-0" />
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="h-3 bg-slate-200 rounded w-24" />
                  <div className="h-2 bg-slate-200 rounded w-32" />
                </div>
              </div>
            ))}
          </div>

          {/* Área de conteúdo skeleton */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Cabeçalho da seção */}
            <div className="px-8 py-4 border-b border-slate-100 bg-white flex-shrink-0 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-200 flex-shrink-0" />
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-32" />
                  <div className="h-2 bg-slate-200 rounded w-64" />
                </div>
              </div>
            </div>

            {/* Conteúdo da seção */}
            <div className="flex-1 overflow-y-auto">
              <CardContent className="space-y-4 py-5 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-8 px-0 border-b border-slate-100 last:border-0 pb-5"
                  >
                    {/* Label coluna */}
                    <div className="w-48 flex-shrink-0 space-y-2 pt-1">
                      <div className="h-3 bg-slate-200 rounded w-24" />
                      <div className="h-2 bg-slate-200 rounded w-32" />
                    </div>

                    {/* Campo coluna */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="h-9 bg-slate-200 rounded-lg max-w-md" />
                      <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
                        <div className="h-9 bg-slate-200 rounded-lg" />
                        <div className="h-9 bg-slate-200 rounded-lg" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

