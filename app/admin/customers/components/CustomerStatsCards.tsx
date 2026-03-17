import { CardHighlighted } from "@/app/components/ui/card";
import { Users, CheckCircle, XCircle, Mail } from "lucide-react";

type CustomerLike = {
  id: string;
  active: boolean;
  email?: string | null;
};

interface CustomerStatsCardsProps {
  customers: CustomerLike[];
}

export function CustomerStatsCards({ customers }: CustomerStatsCardsProps) {
  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.active).length,
    inactive: customers.filter((c) => !c.active).length,
    withEmail: customers.filter((c) => !!c.email).length,
  };

  const items = [
    {
      label: "Total de clientes",
      value: stats.total.toString(),
      sublabel: "cadastrados no sistema",
      icon: Users,
      highlightColor: "info" as const,
      iconBg: "bg-gradient-to-br from-blue-50 to-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Clientes ativos",
      value: stats.active.toString(),
      sublabel: "com cadastro em uso",
      icon: CheckCircle,
      highlightColor: "success" as const,
      iconBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Clientes inativos",
      value: stats.inactive.toString(),
      sublabel: "sem uso recente",
      icon: XCircle,
      highlightColor: "warning" as const,
      iconBg: "bg-gradient-to-br from-amber-50 to-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Com e-mail cadastrado",
      value: stats.withEmail.toString(),
      sublabel: "clientes com contato por e-mail",
      icon: Mail,
      highlightColor: "primary" as const,
      iconBg: "bg-gradient-to-br from-violet-50 to-violet-100",
      iconColor: "text-violet-600",
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

