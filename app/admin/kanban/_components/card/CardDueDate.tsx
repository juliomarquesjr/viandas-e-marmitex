"use client";

import { differenceInDays, differenceInHours, isBefore, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardDueDateProps {
  dueDate: string;
  compact?: boolean;
}

export function CardDueDate({ dueDate, compact = false }: CardDueDateProps) {
  const date = new Date(dueDate);
  const now = new Date();
  const hoursLeft = differenceInHours(date, now);
  const daysLeft = differenceInDays(date, now);
  const isOverdue = isBefore(date, now);

  let label: string;
  let className: string;

  if (isOverdue) {
    label = compact ? "Atrasado" : format(date, "dd MMM", { locale: ptBR });
    className = "bg-red-500/20 text-red-300 border-red-500/30";
  } else if (hoursLeft < 24) {
    label = "Hoje";
    className = "bg-amber-500/20 text-amber-300 border-amber-500/30";
  } else if (daysLeft <= 3) {
    label = `${daysLeft}d`;
    className = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
  } else {
    label = compact ? format(date, "dd MMM", { locale: ptBR }) : format(date, "dd MMM", { locale: ptBR });
    className = "bg-white/10 text-white/60 border-white/10";
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        className
      )}
    >
      <Clock className="h-2.5 w-2.5 flex-shrink-0" />
      <span>{label}</span>
    </div>
  );
}
