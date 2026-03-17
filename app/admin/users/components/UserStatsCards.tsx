import { CardHighlighted } from "@/app/components/ui/card";
import { Shield, User, Users } from "lucide-react";

type UserLike = {
  id: string;
  status: "active" | "inactive";
  role: "admin" | "pdv";
  facialImageUrl?: string;
};

interface UserStatsCardsProps {
  users: UserLike[];
}

export function UserStatsCards({ users }: UserStatsCardsProps) {
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    inactive: users.filter((u) => u.status === "inactive").length,
    admins: users.filter((u) => u.role === "admin").length,
    withFacial: users.filter((u) => u.facialImageUrl).length,
  };

  const items = [
    {
      label: "Total de usuários",
      value: stats.total.toString(),
      sublabel: "cadastrados no sistema",
      icon: Users,
      highlightColor: "info" as const,
      iconBg: "bg-gradient-to-br from-blue-50 to-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Usuários ativos",
      value: stats.active.toString(),
      sublabel: "com acesso habilitado",
      icon: User,
      highlightColor: "success" as const,
      iconBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Usuários inativos",
      value: stats.inactive.toString(),
      sublabel: "sem acesso ao sistema",
      icon: User,
      highlightColor: "warning" as const,
      iconBg: "bg-gradient-to-br from-amber-50 to-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Administradores",
      value: stats.admins.toString(),
      sublabel: "com perfil de administração",
      icon: Shield,
      highlightColor: "primary" as const,
      iconBg: "bg-gradient-to-br from-violet-50 to-violet-100",
      iconColor: "text-violet-600",
    },
    {
      label: "Com reconhecimento facial",
      value: stats.withFacial.toString(),
      sublabel: "biometria facial cadastrada",
      icon: User,
      highlightColor: "error" as const,
      iconBg: "bg-gradient-to-br from-red-50 to-red-100",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
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

