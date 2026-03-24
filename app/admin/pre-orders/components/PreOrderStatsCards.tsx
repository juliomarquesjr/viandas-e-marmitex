import { CardHighlighted } from "@/app/components/ui/card";
import { ShoppingCart, Receipt, Tag, Ticket } from "lucide-react";

type PreOrderLike = {
  id: string;
  totalCents: number;
  discountCents: number;
};

interface PreOrderStatsCardsProps {
  preOrders: PreOrderLike[];
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

export function PreOrderStatsCards({ preOrders }: PreOrderStatsCardsProps) {
  const totalValue = preOrders.reduce((sum, p) => sum + p.totalCents, 0);
  const itemsWithDiscount = preOrders.filter((p) => p.discountCents > 0).length;
  const totalDiscount = preOrders.reduce((sum, p) => sum + p.discountCents, 0);

  const stats = [
    {
      label: "Total de pré-pedidos",
      value: preOrders.length.toString(),
      sublabel: "no período filtrado",
      icon: ShoppingCart,
      highlightColor: "info" as const,
      iconBg: "bg-gradient-to-br from-blue-50 to-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Valor total",
      value: formatCurrency(totalValue),
      sublabel: "somatório dos pré-pedidos",
      icon: Receipt,
      highlightColor: "success" as const,
      iconBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Com desconto",
      value: itemsWithDiscount.toString(),
      sublabel: "pré-pedidos com desconto aplicado",
      icon: Tag,
      highlightColor: "warning" as const,
      iconBg: "bg-gradient-to-br from-amber-50 to-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Total em descontos",
      value: formatCurrency(totalDiscount),
      sublabel: "soma de todos os descontos",
      icon: Ticket,
      highlightColor: "error" as const,
      iconBg: "bg-gradient-to-br from-red-50 to-red-100",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
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

