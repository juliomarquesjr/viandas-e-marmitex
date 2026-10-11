"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PageHeader - Design System
 *
 * Cabeçalho das páginas do admin: uma linha só, sem caminho de navegação e sem faixa própria. Ícone,
 * título, uma linha de apoio (o que ajuda a decidir: contagem, período, estado) e as ações à direita.
 * É o mesmo desenho dos Pré-Pedidos e das Conversas, para as telas não gastarem altura com o topo.
 * Em tela estreita as ações descem para uma linha própria, com a largura toda.
 */
interface PageHeaderProps {
  title: string;
  /** Uma frase curta (cabe em uma linha). Textos longos ficam para dentro da página. */
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
  /** Abas ou filtros logo abaixo do cabeçalho. */
  children?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actions, className, children }: PageHeaderProps) {
  return (
    <div className={className}>
      <header className="flex flex-wrap items-center gap-3">
        {Icon && (
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1 basis-40">
          <h1 className="truncate text-xl font-semibold leading-6 text-[color:var(--foreground)]">{title}</h1>
          {description && (
            <p className="truncate text-xs text-[color:var(--muted-foreground)]" title={description}>
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto md:flex-nowrap md:shrink-0">{actions}</div>}
      </header>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

// Mesmo cabeçalho, para as páginas que o importam por este nome
export const SimplePageHeader = PageHeader;

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
