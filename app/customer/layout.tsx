"use client";

import { cn } from "@/lib/utils";
import {
  CreditCard,
  Home,
  LogOut,
  Package,
  User,
} from "lucide-react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ProtectedCustomerRoute } from "./components/ProtectedCustomerRoute";

function CustomerLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ 
      redirect: false,
      callbackUrl: "/customer/login"
    });
    router.push("/customer/login");
  };

  const navItems = [
    { href: "/customer/dashboard", icon: Home, label: "Início" },
    { href: "/customer/profile", icon: User, label: "Perfil" },
    { href: "/customer/expenses", icon: CreditCard, label: "Ficha" },
    { href: "/customer/pre-orders", icon: Package, label: "Pré-Pedidos" },
  ];

  // Se estiver na página de login ou tracking, não renderizar navegação
  const isLoginPage = pathname === "/customer/login";
  const isTrackingPage = pathname?.match(/^\/customer\/pre-orders\/[^\/]+\/tracking$/);

  if (isLoginPage || isTrackingPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50/30 to-yellow-50/50 flex flex-col">
      {/* Top Navigation - Desktop */}
      <nav className="hidden md:flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-orange-200/20 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg"
                    : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        
        <div className="flex items-center gap-4">
          {session?.user && (
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{session.user.name}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:inline">Sair</span>
          </button>
        </div>
      </nav>

      {/* Content Area */}
      <main className="flex-1 overflow-auto pb-24 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Mobile (estilo app) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-orange-200/30 shadow-2xl md:hidden safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-2 max-w-screen-sm mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl min-w-[70px] transition-all duration-300 relative",
                  active
                    ? "text-orange-600"
                    : "text-gray-500"
                )}
              >
                {active && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                )}
                <div className={cn(
                  "p-2.5 rounded-xl transition-all duration-300",
                  active 
                    ? "bg-gradient-to-br from-orange-100 to-amber-100 shadow-md scale-110" 
                    : "hover:bg-gray-100"
                )}>
                  <Icon className={cn(
                    "h-6 w-6 transition-all duration-300",
                    active ? "text-orange-600" : "text-gray-500"
                  )} />
                </div>
                <span className={cn(
                  "text-xs font-semibold transition-all duration-300",
                  active ? "text-orange-600" : "text-gray-500"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth/customer">
      <CustomerLayoutContent>
        {children}
      </CustomerLayoutContent>
    </SessionProvider>
  );
}
