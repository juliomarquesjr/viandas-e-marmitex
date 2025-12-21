"use client";

import { Button } from "@/app/components/ui/button";
import { Separator } from "@/app/components/ui/separator";
import { cn } from "@/lib/utils";
import {
    ChefHat,
    LogOut,
    Menu,
    Package,
    X,
    MapPin
} from "lucide-react";
import { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface ExtendedSession extends Session {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  }
}

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Se estiver na página de tracking ou dashboard, não renderizar o layout padrão
  if (pathname?.includes('/delivery/tracking/') || pathname === '/delivery/dashboard') {
    return <>{children}</>;
  }

  const NavItem = ({ href, icon: Icon, label }: { 
    href: string; 
    icon: React.ElementType; 
    label: string;
  }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          "group relative flex items-center h-14 w-full px-6 gap-4 rounded-2xl font-medium transition-all duration-300 ease-in-out",
          active 
            ? "bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10 text-primary shadow-xl shadow-primary/20 border border-primary/30" 
            : "text-muted-foreground hover:bg-gradient-to-r hover:from-white/60 hover:via-white/40 hover:to-white/20 hover:text-foreground hover:shadow-lg hover:border hover:border-white/30"
        )}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-primary/60 rounded-r-full" />
        )}
        
        <div className="flex items-center justify-center h-8 w-8 transition-all duration-300">
          <Icon className={cn(
            "h-5 w-5 transition-all duration-300",
            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )} />
        </div>
        
        <span className="flex-1 text-sm font-semibold transition-all duration-300 group-hover:translate-x-1">
          {label}
        </span>
      </Link>
    );
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 transform bg-white/90 backdrop-blur-xl border-r border-white/20 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-6 border-b border-white/20 bg-gradient-to-r from-white/90 to-white/70">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <MapPin className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="font-bold text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Entregador
                </div>
                <div className="text-sm text-muted-foreground">Painel de Entregas</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <nav className="flex-1 p-6 space-y-4">
            <NavItem href="/delivery/dashboard" icon={Package} label="Minhas Entregas" />
          </nav>

          <div className="p-6 border-t border-white/20">
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full justify-center gap-3"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/20 bg-white/80 backdrop-blur-xl p-6 shadow-lg">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              className="lg:hidden h-12 w-12 rounded-2xl"
            >
              <Menu className="h-6 w-6" />
            </Button>

            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <MapPin className="h-7 w-7 text-white" />
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Painel de Entregas
                </div>
                <div className="text-sm text-muted-foreground">Acompanhe suas entregas</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/80 border border-white/30">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <ChefHat className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{session.user.name}</span>
                  <span className="text-xs text-gray-500">Entregador</span>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => signOut()}
              className="gap-3"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </div>
        </header>

        <div className="flex flex-1">
          <aside className="hidden lg:block w-72 border-r border-white/20 bg-white/60 backdrop-blur-xl">
            <div className="flex flex-col h-full p-6">
              <nav className="space-y-4">
                <NavItem href="/delivery/dashboard" icon={Package} label="Minhas Entregas" />
              </nav>
            </div>
          </aside>

          <main className="flex-1 overflow-auto p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

