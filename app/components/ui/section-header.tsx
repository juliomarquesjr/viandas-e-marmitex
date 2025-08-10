import * as React from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  icon?: React.ElementType;
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeader({ icon: Icon, title, description, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="hidden h-px flex-1 bg-border md:block" />
    </div>
  );
}


