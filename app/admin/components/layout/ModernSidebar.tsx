"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Database,
  Gauge,
  MapPin,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

/**
 * ModernSidebar - Design System
 * 
 * Sidebar moderna com seções agrupadas e navegação intuitiva.
 * Inspirado em HubSpot/Salesforce.
 */

// Tipos
interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Configuração de navegação
const navigationConfig: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/admin", label: "Dashboard", icon: Gauge },
      { href: "/admin/products", label: "Produtos", icon: Package },
      { href: "/admin/customers", label: "Clientes", icon: Users },
    ],
  },
  {
    title: "Vendas",
    items: [
      { href: "/admin/orders", label: "Vendas", icon: Receipt },
      { href: "/admin/pre-orders", label: "Pré-Pedidos", icon: ShoppingCart },
      { href: "/delivery/dashboard", label: "Entregas", icon: Truck },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/admin/expenses", label: "Despesas", icon: Receipt },
      { href: "/admin/profits", label: "Lucros", icon: BarChart3 },
    ],
  },
  {
    title: "Administração",
    items: [
      { href: "/admin/users", label: "Usuários", icon: Users },
      { href: "/admin/backups", label: "Backups", icon: Database },
      { href: "/admin/settings", label: "Configurações", icon: Settings },
    ],
  },
];

// Contexto para o estado da sidebar
interface SidebarContextType {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

// Provider
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  // Carregar estado do localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, []);

  // Salvar estado no localStorage
  const handleSetCollapsed = React.useCallback((value: boolean) => {
    setCollapsed(value);
    localStorage.setItem("sidebar-collapsed", String(value));
  }, []);

  const toggle = React.useCallback(() => {
    handleSetCollapsed(!collapsed);
  }, [collapsed, handleSetCollapsed]);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, setCollapsed: handleSetCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Componente de item de navegação
interface NavItemProps {
  item: NavItem;
  collapsed: boolean;
}

function NavItemComponent({ item, collapsed }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
        collapsed ? "h-11 w-11 justify-center mx-auto" : "h-11 px-3",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
      )}
      title={collapsed ? item.label : undefined}
    >
      {/* Indicador de item ativo */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
      )}

      <Icon
        className={cn(
          "shrink-0 transition-colors duration-200",
          collapsed ? "h-5 w-5" : "h-5 w-5",
          isActive ? "text-primary" : "text-[color:var(--muted-foreground)] group-hover:text-[color:var(--foreground)]"
        )}
      />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

// Componente de seção
interface NavSectionProps {
  section: NavSection;
  collapsed: boolean;
}

function NavSectionComponent({ section, collapsed }: NavSectionProps) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
          {section.title}
        </h3>
      )}
      <div className="space-y-0.5">
        {section.items.map((item) => (
          <NavItemComponent key={item.href} item={item} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
}

// Sidebar principal
interface ModernSidebarProps {
  className?: string;
  userRole?: string;
}

export function ModernSidebar({ className, userRole }: ModernSidebarProps) {
  const { collapsed, toggle } = useSidebar();

  // Filtrar itens baseado no role do usuário
  const filteredNavigation = React.useMemo(() => {
    if (userRole === "admin") {
      return navigationConfig;
    }
    // Usuários não-admin não veem seção de Administração
    return navigationConfig.filter((section) => section.title !== "Administração");
  }, [userRole]);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen flex-col border-r border-[color:var(--border)] bg-[color:var(--card)] transition-all duration-300 ease-in-out lg:flex",
        collapsed ? "w-[72px]" : "w-[260px]",
        className
      )}
    >
      {/* Header da Sidebar */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-[color:var(--border)]",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">Comida Caseira</span>
              <span className="text-xs text-[color:var(--muted-foreground)]">CRM</span>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link href="/admin" className="flex items-center justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
          </Link>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className={cn(
            "shrink-0 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]",
            collapsed && "absolute -right-3 top-6 h-6 w-6 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {filteredNavigation.map((section) => (
          <NavSectionComponent key={section.title} section={section} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer da Sidebar */}
      <div
        className={cn(
          "shrink-0 border-t border-[color:var(--border)] py-4",
          collapsed ? "px-2" : "px-4"
        )}
      >
        {!collapsed ? (
          <div className="text-center text-xs text-[color:var(--muted-foreground)]">
            <span className="font-medium">Comida Caseira</span>
            <span className="mx-1">•</span>
            <span>v2.1.0</span>
          </div>
        ) : (
          <div className="text-center text-xs text-[color:var(--muted-foreground)]">v2.1</div>
        )}
      </div>
    </aside>
  );
}

// Mobile Sidebar (Drawer)
interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  userRole?: string;
}

export function MobileSidebar({ open, onClose, userRole }: MobileSidebarProps) {
  const pathname = usePathname();

  // Fechar ao navegar
  React.useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Filtrar navegação
  const filteredNavigation = React.useMemo(() => {
    if (userRole === "admin") {
      return navigationConfig;
    }
    return navigationConfig.filter((section) => section.title !== "Administração");
  }, [userRole]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-[280px] transform bg-[color:var(--card)] shadow-xl transition-transform duration-300 ease-in-out lg:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-[color:var(--border)] px-4">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <ChefHat className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[color:var(--foreground)]">Comida Caseira</span>
                <span className="text-xs text-[color:var(--muted-foreground)]">CRM</span>
              </div>
            </Link>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            {filteredNavigation.map((section) => (
              <NavSectionComponent key={section.title} section={section} collapsed={false} />
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-[color:var(--border)] px-4 py-4">
            <div className="text-center text-xs text-[color:var(--muted-foreground)]">
              <span className="font-medium">Comida Caseira</span>
              <span className="mx-1">•</span>
              <span>v2.1.0</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ModernSidebar;
