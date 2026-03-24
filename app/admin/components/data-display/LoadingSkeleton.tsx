"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * LoadingSkeleton - Design System
 * 
 * Componentes de skeleton loading.
 * Inspirado em HubSpot/Salesforce.
 */

// =============================================================================
// SKELETON BASE
// =============================================================================

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-slate-200 rounded",
        animate && "animate-pulse",
        className
      )}
    />
  );
}

// =============================================================================
// SKELETON VARIANTS
// =============================================================================

/** Skeleton de texto */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Skeleton de avatar */
export function SkeletonAvatar({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeStyles = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return <Skeleton className={cn("rounded-full", sizeStyles[size], className)} />;
}

/** Skeleton de botão */
export function SkeletonButton({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeStyles = {
    sm: "h-8 w-16",
    md: "h-10 w-24",
    lg: "h-12 w-32",
  };

  return <Skeleton className={cn("rounded-lg", sizeStyles[size], className)} />;
}

/** Skeleton de input */
export function SkeletonInput({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-full rounded-lg", className)} />;
}

/** Skeleton de card */
export function SkeletonCard({
  hasHeader = true,
  hasFooter = false,
  lines = 3,
  className,
}: {
  hasHeader?: boolean;
  hasFooter?: boolean;
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 p-5 space-y-4", className)}>
      {hasHeader && (
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16 ml-auto" />
        </div>
      )}
      <SkeletonText lines={lines} />
      {hasFooter && (
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TABLE SKELETON
// =============================================================================

export function SkeletonTable({
  rows = 5,
  columns = 4,
  hasHeader = true,
  hasCheckbox = false,
  hasActions = false,
  className,
}: {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  hasCheckbox?: boolean;
  hasActions?: boolean;
  className?: string;
}) {
  const totalColumns = columns + (hasCheckbox ? 1 : 0) + (hasActions ? 1 : 0);

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 overflow-hidden", className)}>
      <table className="w-full">
        {hasHeader && (
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {hasCheckbox && (
                <th className="w-12 px-4 py-3">
                  <Skeleton className="h-4 w-4 rounded" />
                </th>
              )}
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
              {hasActions && (
                <th className="w-12 px-4 py-3">
                  <Skeleton className="h-4 w-4 rounded" />
                </th>
              )}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {hasCheckbox && (
                <td className="w-12 px-4 py-3">
                  <Skeleton className="h-4 w-4 rounded" />
                </td>
              )}
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <Skeleton
                    className={cn(
                      "h-4",
                      colIndex === 0 ? "w-32" : colIndex === columns - 1 ? "w-16" : "w-24"
                    )}
                  />
                </td>
              ))}
              {hasActions && (
                <td className="w-12 px-4 py-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// LIST SKELETON
// =============================================================================

export function SkeletonList({
  items = 5,
  hasAvatar = true,
  hasSecondary = true,
  className,
}: {
  items?: number;
  hasAvatar?: boolean;
  hasSecondary?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200"
        >
          {hasAvatar && <SkeletonAvatar />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            {hasSecondary && <Skeleton className="h-3 w-24" />}
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// DASHBOARD SKELETON
// =============================================================================

export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard lines={8} />
        <SkeletonCard lines={8} />
      </div>

      {/* Table */}
      <SkeletonTable rows={5} columns={4} />
    </div>
  );
}

// =============================================================================
// PAGE SKELETON
// =============================================================================

export function SkeletonPage({
  hasHeader = true,
  hasFilters = true,
  hasTable = true,
  className,
}: {
  hasHeader?: boolean;
  hasFilters?: boolean;
  hasTable?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {hasHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </div>
      )}

      {hasFilters && (
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg ml-auto" />
        </div>
      )}

      {hasTable && <SkeletonTable />}
    </div>
  );
}

// =============================================================================
// LOADING OVERLAY
// =============================================================================

export function LoadingOverlay({
  visible,
  text = "Carregando...",
}: {
  visible: boolean;
  text?: string;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        {text && <p className="text-sm text-slate-600">{text}</p>}
      </div>
    </div>
  );
}

// =============================================================================
// INLINE LOADING
// =============================================================================

export function InlineLoading({
  text = "Carregando...",
  size = "md",
}: {
  text?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeStyles = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
  };

  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <div
        className={cn(
          "rounded-full border-slate-200 border-t-primary animate-spin",
          sizeStyles[size]
        )}
      />
      {text && <span className="text-sm text-slate-600">{text}</span>}
    </div>
  );
}

export default Skeleton;
