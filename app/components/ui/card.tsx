import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Card Component - Design System
 * 
 * Cards modernos com variantes para diferentes contextos.
 * Inspirado em HubSpot/Salesforce.
 */

const cardVariants = cva(
  "bg-[color:var(--card)] text-[color:var(--foreground)] transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border border-[color:var(--border)] rounded-xl shadow-card",
        elevated: "border-0 rounded-xl shadow-md hover:shadow-lg",
        outline: "border border-[color:var(--border)] rounded-xl",
        ghost: "border-0 rounded-xl",
        interactive: "cursor-pointer rounded-xl border border-[color:var(--border)] shadow-card hover:border-[color:var(--border-dark)] hover:shadow-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof cardVariants> {}

export const Card = ({ className, variant, ...props }: CardProps) => (
  <div className={cn(cardVariants({ variant }), className)} {...props} />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 border-b border-[color:var(--border)] p-5", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-semibold leading-none tracking-tight text-[color:var(--foreground)]", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-[color:var(--muted-foreground)]", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex items-center gap-3 border-t border-[color:var(--border)] p-5 pt-0", className)} {...props} />
);

// Componentes adicionais para casos específicos

/** Card compacto para listas e grids densos */
export const CardCompact = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm", className)} {...props}>
    {children}
  </div>
);

/** Card com destaque visual (borda colorida no topo) */
export const CardHighlighted = ({ 
  className, 
  highlightColor = "primary",
  children, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { highlightColor?: "primary" | "success" | "warning" | "error" | "info" }) => {
  const highlightColors = {
    primary: "border-t-primary",
    success: "border-t-emerald-500",
    warning: "border-t-amber-500",
    error: "border-t-red-500",
    info: "border-t-blue-500",
  };

  return (
    <div 
      className={cn(
        "rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] border-t-4 shadow-card",
        highlightColors[highlightColor],
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
};

/** Seção dentro do card */
export const CardSection = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("border-b border-[color:var(--border)] py-4 last:border-b-0", className)} {...props} />
);


