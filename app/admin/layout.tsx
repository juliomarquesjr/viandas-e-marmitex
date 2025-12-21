"use client";

import { Button } from "@/app/components/ui/button";
import { Separator } from "@/app/components/ui/separator";
import { cn } from "@/lib/utils";
import {
    BarChart3,
    ChefHat,
    Database,
    Gauge,
    LogOut,
    MapPin,
    Menu,
    Package,
    Receipt,
    Settings,
    ShoppingCart,
    User,
    Users,
    X
} from "lucide-react";
import { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import RoAssistant from "./components/ro-assistant";

// Definir o tipo extendido para a sessão
interface ExtendedSession extends Session {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          "group relative flex items-center rounded-2xl font-medium transition-all duration-300 ease-in-out",
          sidebarCollapsed 
            ? "h-14 w-14 mx-auto justify-center" 
            : "h-14 w-full px-6 gap-4",
          active 
            ? "bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10 text-primary shadow-xl shadow-primary/20 border border-primary/30" 
            : "text-muted-foreground hover:bg-gradient-to-r hover:from-white/60 hover:via-white/40 hover:to-white/20 hover:text-foreground hover:shadow-lg hover:border hover:border-white/30"
        )}
      >
        {/* Active indicator */}
        {active && !sidebarCollapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-primary/60 rounded-r-full" />
        )}
        
        <div className={cn(
          "flex items-center justify-center transition-all duration-300",
          sidebarCollapsed ? "h-10 w-10" : "h-8 w-8"
        )}>
          <Icon className={cn(
            "transition-all duration-300",
            sidebarCollapsed ? "h-6 w-6" : "h-5 w-5",
            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )} />
        </div>
        
        {!sidebarCollapsed && (
          <span className="flex-1 text-sm font-semibold transition-all duration-300 group-hover:translate-x-1">
            {label}
          </span>
        )}
        
        {/* Hover effect overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </Link>
    );
  };

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
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
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20 bg-gradient-to-r from-white/90 to-white/70">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <ChefHat className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="font-bold text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Comida Caseira
                </div>
                <div className="text-sm text-muted-foreground">Admin Panel</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all duration-300 hover:scale-110 hover:shadow-lg"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 p-6 space-y-4">
            <NavItem href="/admin" icon={Gauge} label="Dashboard" />
            <NavItem href="/admin/products" icon={Package} label="Produtos" />
            <NavItem href="/admin/customers" icon={Users} label="Clientes" />
            <NavItem href="/admin/orders" icon={Receipt} label="Vendas" />
            <NavItem href="/admin/pre-orders" icon={ShoppingCart} label="Pré-Pedidos" />
            {session?.user?.role === "admin" && (
              <NavItem href="/admin/users" icon={Users} label="Usuários" />
            )}
            <Separator className="my-4 bg-white/20" />
            <NavItem href="/delivery/dashboard" icon={MapPin} label="Entregas" />
            <NavItem href="/admin/expenses" icon={Receipt} label="Despesas" />
            <NavItem href="/admin/profits" icon={BarChart3} label="Lucros" />
            <Separator className="my-8 bg-white/20" />
            <NavItem href="/admin/settings" icon={Settings} label="Configurações" />
          </nav>

          {/* Mobile Footer */}
          <div className="p-6 border-t border-white/20 bg-gradient-to-r from-white/50 to-white/30">
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full justify-center gap-3 border-white/30 text-muted-foreground hover:bg-white/30 hover:text-foreground hover:shadow-lg transition-all duration-300 hover:scale-[1.02] h-14 rounded-2xl"
            >
              <LogOut className="h-5 w-5" />
              Sair do Sistema
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="flex flex-col min-h-screen">
        {/* Enhanced Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/20 bg-white/80 backdrop-blur-xl p-6 shadow-lg">
          <div className="flex items-center gap-6">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              className="lg:hidden h-12 w-12 rounded-2xl hover:bg-white/20 hover:shadow-lg transition-all duration-300"
            >
              <Menu className="h-6 w-6" />
            </Button>

            {/* Logo and Brand */}
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <ChefHat className="h-7 w-7 text-white" />
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Comida Caseira
                </div>
                <div className="text-sm text-muted-foreground">Painel Administrativo</div>
              </div>
            </div>

            <Separator orientation="vertical" className="mx-2 h-10 bg-white/20" />
            
            {/* Desktop Menu Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hidden lg:flex h-14 w-14 rounded-2xl hover:bg-white/30 hover:shadow-xl transition-all duration-300 border-2 border-white/30 bg-white/20"
            >
              <Menu className="h-7 w-7 text-primary transition-transform duration-300" />
            </Button>
            

          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            {session?.user && (
              <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/80 border border-white/30 backdrop-blur-sm shadow-sm">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">
                    {session.user.name}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {session.user.role === "admin" ? "Administrador" : "PDV"}
                  </span>
                </div>
              </div>
            )}

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-4">
              {/* Abrir PDV */}
              <Link 
                href="/pdv" 
                className="rounded-2xl border-2 border-white/30 px-6 py-4 text-sm font-semibold hover:bg-white/30 hover:border-white/50 hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/20 flex items-center gap-3 h-14"
              >
                <ShoppingCart className="h-6 w-6" />
                Abrir PDV
              </Link>

              {/* Sair */}
              <Button
                variant="outline"
                onClick={() => signOut()}
                className="gap-3 px-6 py-4 h-14 rounded-2xl border-2 border-white/30 hover:bg-white/30 hover:border-white/50 hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/20 font-semibold"
              >
                <LogOut className="h-6 w-6" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          {/* Enhanced Sidebar */}
          <aside className={cn(
            "hidden lg:block border-r border-white/20 bg-white/60 backdrop-blur-xl transition-all duration-500 ease-in-out shadow-xl",
            sidebarCollapsed ? "w-24" : "w-72"
          )}>
            <div className="flex flex-col h-full">
              {/* Navigation */}
              <nav className="flex-1 p-6 space-y-4">
                <NavItem href="/admin" icon={Gauge} label="Dashboard" />
                <NavItem href="/admin/products" icon={Package} label="Produtos" />
                <NavItem href="/admin/customers" icon={Users} label="Clientes" />
                <NavItem href="/admin/orders" icon={Receipt} label="Vendas" />
                <NavItem href="/admin/pre-orders" icon={ShoppingCart} label="Pré-Pedidos" />
                {session?.user?.role === "admin" && (
                  <NavItem href="/admin/users" icon={Users} label="Usuários" />
                )}
                <Separator className="my-4 bg-white/20" />
                <NavItem href="/delivery/dashboard" icon={MapPin} label="Entregas" />
                <NavItem href="/admin/expenses" icon={Receipt} label="Despesas" />
                <NavItem href="/admin/profits" icon={BarChart3} label="Lucros" />
                <Separator className="my-8 bg-white/20" />
                {session?.user?.role === "admin" && (
                  <NavItem href="/admin/backups" icon={Database} label="Backups" />
                )}
                <NavItem href="/admin/settings" icon={Settings} label="Configurações" />
              </nav>

              {/* Sidebar Footer */}
              <div className="p-6 border-t border-white/20">
                <div className="text-center">
                  {!sidebarCollapsed && (
                    <div className="text-sm text-muted-foreground mb-3 font-medium">
                      Comida Caseira
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground bg-white/30 rounded-lg px-3 py-2 font-medium">
                    v2.1.0
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-8">
            {children}
          </main>
        </div>
      </div>
      <RoAssistant />
    </div>
  );
}
