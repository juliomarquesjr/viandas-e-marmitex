"use client";

import { EmptyState } from "@/app/admin/components/data-display/EmptyState";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/lib/utils";
import { isWeightBasedProduct } from "@/lib/weight";
import {
  History,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  Search,
  Users,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { formatCurrency, formatWhen, initialsOf } from "../lib/preOrderView";
import {
  addressLineOf,
  presetTotal,
  type CatalogProduct,
  type CustomerPreset,
  type CustomerSummary,
  type DeskCustomer,
} from "../lib/orderDraft";

type OrderDeskCustomerProps = {
  results: DeskCustomer[];
  searching: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  selected: DeskCustomer | null;
  summary: CustomerSummary | null;
  presets: CustomerPreset[];
  presetsLoading: boolean;
  products: CatalogProduct[];
  onSelect: (customer: DeskCustomer) => void;
  onClear: () => void;
  onApplyPreset: () => void;
  onAddProduct: (product: CatalogProduct) => void;
  /** Força a lista completa mesmo com um cliente já escolhido. */
  browsing: boolean;
  onBrowse: (browsing: boolean) => void;
  disabled?: boolean;
};

export function OrderDeskCustomer(props: OrderDeskCustomerProps) {
  const { selected, query, onQueryChange, browsing, onBrowse, disabled } = props;
  const filtering = Boolean(query.trim());

  return (
    <div className="flex min-h-0 flex-col bg-[color:var(--background)]">
      <div className="border-b border-[color:var(--border)] bg-[color:var(--card)] px-3.5 py-3">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={selected ? "Trocar de cliente" : "Buscar cliente — nome ou telefone"}
          aria-label="Buscar cliente"
          disabled={disabled}
          leftIcon={<Search className="h-4 w-4" />}
          rightIcon={
            query ? (
              <button
                type="button"
                onClick={() => {
                  onQueryChange("");
                  // Limpar não devolve ao dossiê: quem limpou quer a lista de volta.
                  onBrowse(true);
                }}
                aria-label="Limpar busca e ver todos os clientes"
                title="Limpar busca e ver todos os clientes"
              >
                <X className="h-4 w-4" />
              </button>
            ) : undefined
          }
        />
      </div>

      {/* Buscar e navegar têm precedência sobre o dossiê: quem digitou quer trocar. */}
      {selected && !filtering && !browsing ? (
        <Dossier {...props} customer={selected} />
      ) : (
        <Results {...props} />
      )}
    </div>
  );
}

// =============================================================================
// LISTA
// =============================================================================

function Results({
  results,
  searching,
  query,
  selected,
  onSelect,
  onClear,
  onBrowse,
  disabled,
}: OrderDeskCustomerProps) {
  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-2">
      <p className="flex items-center gap-2 px-1.5 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--muted-foreground-strong)]">
        {searching ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Buscando
          </>
        ) : query.trim() ? (
          `${results.length} encontrado${results.length === 1 ? "" : "s"}`
        ) : (
          `Todos os clientes · ${results.length}`
        )}
        <span aria-hidden="true" className="h-px flex-1 bg-[color:var(--border)]" />
      </p>

      {results.length === 0 && !searching ? (
        <div className="flex justify-center pt-8">
          <EmptyState
            size="sm"
            variant="default"
            icon={UserRound}
            title="Nenhum cliente"
            description={
              query.trim()
                ? `Nada para "${query}". O pedido pode seguir sem cliente.`
                : "Nenhum cliente cadastrado ainda."
            }
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {results.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => onSelect(customer)}
                title={`Escolher ${customer.name}`}
                disabled={disabled}
                aria-pressed={selected?.id === customer.id}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  selected?.id === customer.id
                    ? "bg-[color:var(--primary-lighter)]"
                    : "hover:bg-[color:var(--muted)]"
                )}
              >
                <Avatar customer={customer} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold leading-tight">
                    {customer.name}
                  </span>
                  <span className="block truncate text-[11px] tabular-nums text-[color:var(--muted-foreground)]">
                    {customer.phone || "Telefone não cadastrado"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="mt-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onBrowse(false)}
            disabled={disabled}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-[12px] font-semibold text-[color:var(--foreground)] transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            Voltar para {selected.name.split(/\s+/)[0]}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="w-full rounded-lg border border-dashed border-[color:var(--border-dark)] px-3 py-2 text-[12px] font-semibold text-[color:var(--muted-foreground)] transition-colors hover:border-rose-400 hover:text-rose-500 disabled:opacity-50"
          >
            Seguir sem cliente
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DOSSIÊ
// =============================================================================

function Dossier({
  customer,
  summary,
  presets,
  presetsLoading,
  products,
  onClear,
  onApplyPreset,
  onAddProduct,
  onBrowse,
  disabled,
}: OrderDeskCustomerProps & { customer: DeskCustomer }) {
  const address = addressLineOf(customer);
  const preset = presetTotal(presets, products);
  /** Preset a peso não entra na comanda em lote: quantidade não é quilo. */
  const usable = presets.filter((entry) => {
    const product = products.find((candidate) => candidate.id === entry.productId);
    return !!product && product.active && !isWeightBasedProduct(product);
  });

  return (
    <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <Avatar customer={customer} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-tight">{customer.name}</p>
          <p className="truncate text-[11.5px] tabular-nums text-[color:var(--muted-foreground)]">
            {customer.phone || "Telefone não cadastrado"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          aria-label="Remover cliente do pedido"
          title="Remover cliente do pedido"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[color:var(--muted-foreground)] transition-colors hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onBrowse(true)}
        disabled={disabled}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-[12px] font-semibold text-[color:var(--muted-foreground)] transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
      >
        <Users className="h-3.5 w-3.5" />
        Ver todos os clientes
      </button>

      <div className="grid grid-cols-2 gap-1.5">
        <Stat label="Pedidos" value={summary ? String(summary.orderCount) : "—"} />
        <Stat
          label="Em aberto"
          value={summary ? formatCurrency(summary.debtBalanceCents) : "—"}
          alert={!!summary && summary.debtBalanceCents > 0}
        />
      </div>

      {presetsLoading ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-[color:var(--border)] px-3 py-2.5 text-[12px] text-[color:var(--muted-foreground)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando o de sempre…
        </p>
      ) : usable.length > 0 ? (
        <button
          type="button"
          onClick={onApplyPreset}
          disabled={disabled}
          className="flex items-center gap-2.5 rounded-xl border border-dashed px-3 py-2.5 text-left transition-all hover:border-solid disabled:opacity-50 [border-color:var(--state-pronto)] [background:var(--state-pronto-bg)] [color:var(--state-pronto-fg)]"
        >
          <Zap className="h-4 w-4 flex-none" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-bold">Carregar “o de sempre”</span>
            <span className="block text-[11px] tabular-nums opacity-90">
              {preset.units} un. · {formatCurrency(preset.cents)}
            </span>
          </span>
        </button>
      ) : null}

      <dl className="flex flex-col gap-2 text-[12px] text-[color:var(--muted-foreground-strong)]">
        {address && (
          <div className="flex items-start gap-2">
            <dt className="flex-none pt-0.5 text-[color:var(--muted-foreground)]">
              <MapPin className="h-3.5 w-3.5" />
              <span className="sr-only">Endereço</span>
            </dt>
            <dd className="min-w-0 leading-snug">{address}</dd>
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-2">
            <dt className="flex-none text-[color:var(--muted-foreground)]">
              <Phone className="h-3.5 w-3.5" />
              <span className="sr-only">Telefone</span>
            </dt>
            <dd className="tabular-nums">{customer.phone}</dd>
          </div>
        )}
        <div className="flex items-center gap-2">
          <dt className="flex-none text-[color:var(--muted-foreground)]">
            <History className="h-3.5 w-3.5" />
            <span className="sr-only">Último pedido</span>
          </dt>
          <dd>
            {summary?.lastOrderAt
              ? `Último pedido ${formatWhen(summary.lastOrderAt)}`
              : summary
                ? "Ainda sem pedidos"
                : "Carregando histórico…"}
          </dd>
        </div>
      </dl>

      {usable.length > 0 && (
        <>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--muted-foreground-strong)]">
            Compra sempre
            <span aria-hidden="true" className="h-px flex-1 bg-[color:var(--border)]" />
          </p>
          <ul className="flex flex-col gap-1.5">
            {usable.map((entry) => {
              const product = products.find((candidate) => candidate.id === entry.productId)!;
              return (
                <li key={entry.productId}>
                  <button
                    type="button"
                    onClick={() => onAddProduct(product)}
                    disabled={disabled}
                    title={`Adicionar ${product.name}`}
                    className="flex w-full items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-2 py-1.5 text-left transition-colors hover:border-primary hover:bg-[color:var(--primary-lighter)] disabled:opacity-50"
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-md bg-[color:var(--muted)]">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-3.5 w-3.5 text-[color:var(--muted-foreground)]" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                      {product.name}
                    </span>
                    <span className="flex-none text-[11px] font-bold tabular-nums text-[color:var(--muted-foreground)]">
                      ×{entry.quantity}
                    </span>
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md bg-primary text-white">
                      <Plus className="h-3 w-3" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl px-2.5 py-2",
        alert ? "[background:var(--state-cobrar-bg)]" : "bg-[color:var(--muted)]"
      )}
    >
      <p
        className={cn(
          "text-[9.5px] font-bold uppercase tracking-[0.09em]",
          alert ? "[color:var(--state-cobrar-fg)]" : "text-[color:var(--muted-foreground)]"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-[17px] font-bold leading-tight tabular-nums",
          alert && "[color:var(--state-cobrar-fg)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Avatar({ customer, size = "md" }: { customer: DeskCustomer; size?: "md" | "lg" }) {
  const dimension = size === "lg" ? "h-10 w-10 text-[13px]" : "h-8 w-8 text-[11px]";

  if (customer.imageUrl) {
    return (
      <img
        src={customer.imageUrl}
        alt=""
        className={cn("flex-none rounded-full object-cover ring-1 ring-[color:var(--border)]", dimension)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex flex-none items-center justify-center rounded-full font-bold",
        "bg-[color:var(--primary-light)] text-primary",
        dimension
      )}
    >
      {initialsOf(customer.name)}
    </span>
  );
}
