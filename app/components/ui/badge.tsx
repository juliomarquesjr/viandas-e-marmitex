import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../../lib/utils";

/**
 * Badge Component - Design System
 * 
 * Badges modernos para status, categorias e contadores.
 * Inspirado em HubSpot/Salesforce.
 */

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        // Variantes de cor
        default: "bg-slate-100 text-slate-700",
        primary: "bg-blue-100 text-blue-700",
        secondary: "bg-slate-200 text-slate-800",
        
        // Status
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-700",
        error: "bg-red-100 text-red-700",
        info: "bg-blue-100 text-blue-700",
        
        // Status com ponto indicador
        "success-dot": "bg-emerald-50 text-emerald-700 border border-emerald-200",
        "warning-dot": "bg-amber-50 text-amber-700 border border-amber-200",
        "error-dot": "bg-red-50 text-red-700 border border-red-200",
        "info-dot": "bg-blue-50 text-blue-700 border border-blue-200",
        
        // Variantes de estilo
        outline: "bg-transparent border border-slate-300 text-slate-700",
        solid: "bg-slate-700 text-white",
        
        // Específicos para status de pedidos
        pending: "bg-amber-100 text-amber-800",
        confirmed: "bg-blue-100 text-blue-800",
        preparing: "bg-indigo-100 text-indigo-800",
        ready: "bg-emerald-100 text-emerald-800",
        delivered: "bg-purple-100 text-purple-800",
        cancelled: "bg-red-100 text-red-800",
      },
      size: {
        sm: "text-xs px-2 py-0.5 rounded",
        default: "text-xs px-2.5 py-1 rounded-md",
        lg: "text-sm px-3 py-1.5 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Mostra um ponto indicador antes do texto */
  dot?: boolean;
  /** Ícone opcional */
  icon?: React.ReactNode;
}

export const Badge = ({ className, variant, size, dot, icon, children, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
    {dot && (
      <span 
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          variant === "success" && "bg-emerald-500",
          variant === "success-dot" && "bg-emerald-500",
          variant === "warning" && "bg-amber-500",
          variant === "warning-dot" && "bg-amber-500",
          variant === "error" && "bg-red-500",
          variant === "error-dot" && "bg-red-500",
          variant === "info" && "bg-blue-500",
          variant === "info-dot" && "bg-blue-500",
          variant === "pending" && "bg-amber-500",
          variant === "confirmed" && "bg-blue-500",
          variant === "preparing" && "bg-indigo-500",
          variant === "ready" && "bg-emerald-500",
          variant === "delivered" && "bg-purple-500",
          variant === "cancelled" && "bg-red-500",
          !variant && "bg-slate-500"
        )} 
      />
    )}
    {icon && <span className="shrink-0">{icon}</span>}
    {children}
  </div>
);

/**
 * StatusBadge - Componente específico para status
 */
export const statusConfig = {
  pending: { label: "Pendente", variant: "pending" as const },
  confirmed: { label: "Confirmado", variant: "confirmed" as const },
  preparing: { label: "Preparando", variant: "preparing" as const },
  ready: { label: "Pronto", variant: "ready" as const },
  delivered: { label: "Entregue", variant: "delivered" as const },
  cancelled: { label: "Cancelado", variant: "cancelled" as const },
  active: { label: "Ativo", variant: "success" as const },
  inactive: { label: "Inativo", variant: "default" as const },
};

export interface StatusBadgeProps {
  status: keyof typeof statusConfig;
  customLabel?: string;
  size?: "sm" | "default" | "lg";
  dot?: boolean;
  className?: string;
}

export const StatusBadge = ({ status, customLabel, size, dot = true, className }: StatusBadgeProps) => {
  const config = statusConfig[status] || { label: status, variant: "default" as const };
  
  return (
    <Badge variant={config.variant} size={size} dot={dot} className={className}>
      {customLabel || config.label}
    </Badge>
  );
};

/**
 * CountBadge - Badge para contadores
 */
export interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: "primary" | "error" | "warning";
  size?: "sm" | "default";
  className?: string;
}

export const CountBadge = ({ 
  count, 
  max = 99, 
  variant = "primary",
  size = "sm",
  className 
}: CountBadgeProps) => {
  const displayCount = count > max ? `${max}+` : count;
  
  const variantStyles = {
    primary: "bg-primary text-white",
    error: "bg-red-500 text-white",
    warning: "bg-amber-500 text-white",
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-full min-w-[20px] h-5 px-1.5 text-xs",
        variantStyles[variant],
        size === "sm" && "min-w-[18px] h-4 text-[10px]",
        className
      )}
    >
      {displayCount}
    </span>
  );
};


