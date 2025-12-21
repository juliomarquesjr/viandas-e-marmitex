"use client";

import { Clock, Package, Truck, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DeliveryStatus = 
  | "pending" 
  | "preparing" 
  | "out_for_delivery" 
  | "in_transit" 
  | "delivered" 
  | "cancelled";

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<
  DeliveryStatus,
  { label: string; icon: typeof Clock; color: string; bgColor: string }
> = {
  pending: {
    label: "Pendente",
    icon: Clock,
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  preparing: {
    label: "Preparando",
    icon: Package,
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  out_for_delivery: {
    label: "Saiu para Entrega",
    icon: Truck,
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  in_transit: {
    label: "Em Trânsito",
    icon: Loader2,
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  delivered: {
    label: "Entregue",
    icon: CheckCircle,
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
};

export function DeliveryStatusBadge({
  status,
  className,
  showIcon = true,
}: DeliveryStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.bgColor,
        config.color,
        className
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            status === "in_transit" && "animate-spin"
          )}
        />
      )}
      {config.label}
    </span>
  );
}

