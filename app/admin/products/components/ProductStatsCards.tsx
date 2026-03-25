import { CardHighlighted } from "@/app/components/ui/card";
import { Package, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type ProductLike = {
  id: string;
  active: boolean;
  stockEnabled: boolean;
  stock?: number | null;
};

interface ProductStatsCardsProps {
  products: ProductLike[];
}

export function ProductStatsCards({ products }: ProductStatsCardsProps) {
  const stats = {
    total: products.length,
    active: products.filter((p) => p.active).length,
    inactive: products.filter((p) => !p.active).length,
    lowStock: products.filter((p) => p.stockEnabled && (p.stock ?? 0) < 10).length,
  };

  const items = [
    {
      label: "Total de produtos",
      value: stats.total.toString(),
      sublabel: "cadastrados no sistema",
      icon: Package,
      highlightColor: "info" as const,
      iconBg: "bg-gradient-to-br from-blue-50 to-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Ativos",
      value: stats.active.toString(),
      sublabel: "disponíveis para venda",
      icon: CheckCircle,
      highlightColor: "success" as const,
      iconBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Inativos",
      value: stats.inactive.toString(),
      sublabel: "não disponíveis",
      icon: XCircle,
      highlightColor: "warning" as const,
      iconBg: "bg-gradient-to-br from-amber-50 to-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Estoque baixo",
      value: stats.lowStock.toString(),
      sublabel: "produtos com menos de 10 un.",
      icon: AlertTriangle,
      highlightColor: "error" as const,
      iconBg: "bg-gradient-to-br from-red-50 to-red-100",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((stat) => (
        <CardHighlighted key={stat.label} highlightColor={stat.highlightColor}>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1.5 truncate">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {stat.sublabel}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} flex-shrink-0 ml-4`}
              >
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        </CardHighlighted>
      ))}
    </div>
  );
}

