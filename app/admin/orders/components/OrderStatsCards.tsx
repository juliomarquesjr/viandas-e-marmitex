import { CardHighlighted } from "@/app/components/ui/card";
import { CreditCard, IdCard, Receipt, User } from "lucide-react";

type OrderLike = {
  id: string;
  totalCents: number;
  paymentMethod: string | null;
  customer: { id: string } | null;
};

interface OrderStatsCardsProps {
  orders: OrderLike[];
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

export function OrderStatsCards({ orders }: OrderStatsCardsProps) {
  const totalSalesValue = orders.reduce((sum, order) => sum + order.totalCents, 0);
  const avulsasOrders = orders.filter((order) => order.customer === null);
  const avulsasValue = avulsasOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const fichaOrders = orders.filter((order) => order.paymentMethod === "invoice");
  const fichaValue = fichaOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const otherOrders = orders.filter(
    (order) => order.customer !== null && order.paymentMethod !== "invoice"
  );
  const otherValue = otherOrders.reduce((sum, order) => sum + order.totalCents, 0);

  const stats = [
    {
      label: "Total de vendas",
      value: formatCurrency(totalSalesValue),
      sublabel: "somatório do período filtrado",
      icon: Receipt,
      highlightColor: "info" as const,
      iconBg: "bg-gradient-to-br from-blue-50 to-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Vendas avulsas",
      value: formatCurrency(avulsasValue),
      sublabel: "sem vínculo a cliente",
      icon: User,
      highlightColor: "warning" as const,
      iconBg: "bg-gradient-to-br from-orange-50 to-orange-100",
      iconColor: "text-orange-600",
    },
    {
      label: "Vendas em ficha",
      value: formatCurrency(fichaValue),
      sublabel: "no caderno/ficha do cliente",
      icon: IdCard,
      highlightColor: "primary" as const,
      iconBg: "bg-gradient-to-br from-violet-50 to-violet-100",
      iconColor: "text-violet-600",
    },
    {
      label: "Outras vendas",
      value: formatCurrency(otherValue),
      sublabel: "demais formas de pagamento",
      icon: CreditCard,
      highlightColor: "success" as const,
      iconBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

