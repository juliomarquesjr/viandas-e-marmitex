import * as React from "react";
import { cn } from "@/lib/utils";

export const Kbd = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-white px-1.5 text-xs font-medium text-foreground shadow-sm",
      className
    )}
    {...props}
  />
);


