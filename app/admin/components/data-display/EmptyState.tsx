"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui/button";
import {
  Inbox,
  Search,
  FileX,
  Users,
  Package,
  ShoppingCart,
  AlertCircle,
  FolderOpen,
} from "lucide-react";

/**
 * EmptyState - Design System
 * 
 * Componente para estados vazios.
 * Inspirado em HubSpot/Salesforce.
 */

// Tipos
type EmptyStateVariant =
  | "default"
  | "search"
  | "no-data"
  | "no-results"
  | "users"
  | "products"
  | "orders"
  | "error";

interface EmptyStateProps {
  /** Título */
  title: string;
  /** Descrição */
  description?: string;
  /** Ícone customizado */
  icon?: React.ElementType;
  /** Variante predefinida */
  variant?: EmptyStateVariant;
  /** Ação principal */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Ação secundária */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Classe customizada */
  className?: string;
  /** Tamanho */
  size?: "sm" | "md" | "lg";
}

// Configuração de ícones por variante
const variantIcons: Record<EmptyStateVariant, React.ElementType> = {
  default: Inbox,
  search: Search,
  "no-data": FolderOpen,
  "no-results": FileX,
  users: Users,
  products: Package,
  orders: ShoppingCart,
  error: AlertCircle,
};

// Configuração de cores por variante
const variantColors: Record<EmptyStateVariant, { bg: string; icon: string }> = {
  default: { bg: "bg-slate-100", icon: "text-slate-400" },
  search: { bg: "bg-blue-50", icon: "text-blue-400" },
  "no-data": { bg: "bg-slate-100", icon: "text-slate-400" },
  "no-results": { bg: "bg-amber-50", icon: "text-amber-400" },
  users: { bg: "bg-purple-50", icon: "text-purple-400" },
  products: { bg: "bg-emerald-50", icon: "text-emerald-400" },
  orders: { bg: "bg-orange-50", icon: "text-orange-400" },
  error: { bg: "bg-red-50", icon: "text-red-400" },
};

// Tamanhos
const sizeStyles = {
  sm: {
    container: "py-8",
    icon: "h-10 w-10",
    title: "text-base",
    description: "text-sm",
  },
  md: {
    container: "py-12",
    icon: "h-12 w-12",
    title: "text-lg",
    description: "text-sm",
  },
  lg: {
    container: "py-16",
    icon: "h-16 w-16",
    title: "text-xl",
    description: "text-base",
  },
};

export function EmptyState({
  title,
  description,
  icon,
  variant = "default",
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant];
  const colors = variantColors[variant];
  const styles = sizeStyles[size];

  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-4", styles.container, className)}>
      {/* Ícone */}
      <div className={cn("flex items-center justify-center rounded-full p-4 mb-4", colors.bg)}>
        <Icon className={cn(styles.icon, colors.icon)} />
      </div>

      {/* Título */}
      <h3 className={cn("font-semibold text-slate-900 mb-1", styles.title)}>{title}</h3>

      {/* Descrição */}
      {description && (
        <p className={cn("text-slate-500 max-w-sm mb-4", styles.description)}>{description}</p>
      )}

      {/* Ações */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <Button onClick={action.onClick} size="default">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick} size="default">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * EmptyStateCard - Empty state dentro de um card
 */
export function EmptyStateCard(props: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <EmptyState {...props} />
    </div>
  );
}

/**
 * NoResultsFound - Para buscas sem resultados
 */
export function NoResultsFound({
  searchTerm,
  onClear,
}: {
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      variant="search"
      title="Nenhum resultado encontrado"
      description={
        searchTerm
          ? `Não encontramos resultados para "${searchTerm}". Tente outros termos.`
          : "Tente ajustar seus filtros ou termos de busca."
      }
      action={onClear ? { label: "Limpar filtros", onClick: onClear } : undefined}
    />
  );
}

/**
 * NoData - Para quando não há dados
 */
export function NoData({
  entity,
  action,
}: {
  entity: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <EmptyState
      variant="no-data"
      title={`Nenhum(a) ${entity} cadastrado(a)`}
      description={`Comece cadastrando seu primeiro(a) ${entity}.`}
      action={action}
    />
  );
}

/**
 * ErrorState - Para estados de erro
 */
export function ErrorState({
  title = "Ocorreu um erro",
  description = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      action={onRetry ? { label: "Tentar novamente", onClick: onRetry } : undefined}
    />
  );
}

export default EmptyState;
