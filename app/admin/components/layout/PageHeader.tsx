"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";

/**
 * PageHeader - Design System
 * 
 * Cabeçalho de página com breadcrumb e ações.
 * Inspirado em HubSpot/Salesforce.
 */

// Mapeamento de rotas para labels
const routeLabels: Record<string, string> = {
  admin: "Admin",
  products: "Produtos",
  customers: "Clientes",
  orders: "Vendas",
  "pre-orders": "Pré-Pedidos",
  expenses: "Despesas",
  profits: "Lucros",
  users: "Usuários",
  settings: "Configurações",
  backups: "Backups",
  delivery: "Entregas",
  dashboard: "Dashboard",
};

// Componente de Breadcrumb
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname();

  // Gerar breadcrumb automaticamente se não fornecido
  const breadcrumbItems = React.useMemo(() => {
    if (items) return items;

    const segments = pathname.split("/").filter(Boolean);
    const generated: BreadcrumbItem[] = [];

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Não adicionar link para o último item (página atual)
      if (index === segments.length - 1) {
        generated.push({ label });
      } else {
        generated.push({ label, href: currentPath });
      }
    });

    return generated;
  }, [pathname, items]);

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav className={cn("flex items-center text-sm", className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {/* Home */}
        <li>
          <Link
            href="/admin"
            className="text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)]"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>

        {/* Items */}
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-[color:var(--border-dark)]" />
            {item.href ? (
              <Link
                href={item.href}
                className="text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-[color:var(--foreground)]">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Componente de PageHeader
interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  breadcrumb,
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <header className={cn("border-b border-[color:var(--border)] bg-[color:var(--card)]", className)}>
      <div className="px-6 py-5">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumb} className="mb-3" />

        {/* Título e Descrição */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-[color:var(--foreground)]">{title}</h1>
              {description && (
                <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">{description}</p>
              )}
            </div>
          </div>

          {/* Ações */}
          {actions && (
            <div className="flex items-center gap-3">{actions}</div>
          )}
        </div>

        {/* Conteúdo adicional (tabs, filtros, etc) */}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </header>
  );
}

// Componente de PageHeader simples (sem borda)
interface SimplePageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SimplePageHeader({
  title,
  description,
  actions,
  className,
}: SimplePageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6", className)}>
      <div>
        <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// Componente de seção de página
interface PageSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function PageSection({
  title,
  description,
  children,
  className,
  actions,
}: PageSectionProps) {
  return (
    <section className={cn("py-6", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export default PageHeader;
