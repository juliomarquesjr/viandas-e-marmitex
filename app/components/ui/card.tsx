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
  "bg-white text-slate-900 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border border-slate-200 rounded-xl shadow-card",
        elevated: "border-0 rounded-xl shadow-md hover:shadow-lg",
        outline: "border border-slate-200 rounded-xl",
        ghost: "border-0 rounded-xl",
        interactive: "border border-slate-200 rounded-xl shadow-card hover:shadow-md hover:border-slate-300 cursor-pointer",
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
  <div className={cn("flex flex-col space-y-1.5 p-5 border-b border-slate-100", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-semibold leading-none tracking-tight text-slate-900", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-slate-500", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-3 p-5 pt-0 border-t border-slate-100 mt-auto", className)} {...props} />
);

// Componentes adicionais para casos específicos

/** Card compacto para listas e grids densos */
export const CardCompact = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("border border-slate-200 rounded-lg p-4 bg-white shadow-sm", className)} {...props}>
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
        "border border-slate-200 rounded-xl bg-white shadow-card border-t-4",
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
  <div className={cn("py-4 border-b border-slate-100 last:border-b-0", className)} {...props} />
);


