"use client";

import { DialogOverlay, DialogPortal } from "@/app/components/ui/dialog";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatWeightKg,
  isWeightBasedProduct,
  parseWeightInput,
  validateWeightKg,
} from "@/lib/weight";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  ClipboardList,
  Loader2,
  Package,
  Printer,
  Save,
  Scale,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../lib/preOrderView";
import {
  emptyDraft,
  formatCentsInput,
  lineTotal,
  parseCentsInput,
  productsOverStock,
  subtotalOf,
  totalOf,
  addProduct as addProductToItems,
  applyPreset,
  isSellable,
  removeItem,
  setQuantity,
  setWeight,
  type CatalogProduct,
  type CustomerPreset,
  type CustomerSummary,
  type DeskCustomer,
  type Draft,
  type DraftItem,
} from "../lib/orderDraft";
import { OrderDeskCatalog, ALL_CATEGORIES } from "./OrderDeskCatalog";
import { OrderDeskCustomer } from "./OrderDeskCustomer";

type OrderDeskProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente cria um pré-pedido; presente abre a Mesa para editar. */
  preOrderId?: string;
  /** `print` pede que a comanda vá para a impressora logo após salvar. */
  onSaved?: (result: { id: string; print: boolean }) => void;
};

/** As colunas viram abas quando não há largura para as três. */
type Tab = "cliente" | "cardapio" | "comanda";

/**
 * A busca por texto pagina; a lista de navegação não. Ver "todos os clientes"
 * tem de mostrar todos mesmo — com 48 nomes, uma página de 25 esconde metade
 * do cadastro sem dizer que escondeu.
 */
const CUSTOMER_SEARCH_SIZE = 25;

function byName(a: DeskCustomer, b: DeskCustomer): number {
  return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
}

export function OrderDesk({ open, onOpenChange, preOrderId, onSaved }: OrderDeskProps) {
  const { showToast } = useToast();

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState<Tab>("cardapio");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);
  const [discountInput, setDiscountInput] = useState("");

  const [customerQuery, setCustomerQuery] = useState("");
  /** O cadastro inteiro, carregado uma vez: é para onde "limpar" volta. */
  const [allCustomers, setAllCustomers] = useState<DeskCustomer[]>([]);
  const [customerResults, setCustomerResults] = useState<DeskCustomer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customer, setCustomer] = useState<DeskCustomer | null>(null);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [presets, setPresets] = useState<CustomerPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  /** Lista aberta por cima do dossiê, para trocar ou só conferir o cadastro. */
  const [browsingCustomers, setBrowsingCustomers] = useState(false);

  const editing = Boolean(preOrderId);

  // ---------------------------------------------------------------------------
  // Carregamento
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const requests: Promise<Response>[] = [
          fetch("/api/products?status=active", {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }),
          fetch("/api/customers?status=active"),
        ];
        if (preOrderId) requests.push(fetch(`/api/pre-orders?id=${preOrderId}`));

        const [productsRes, customersRes, preOrderRes] = await Promise.all(requests);
        if (!productsRes.ok) throw new Error("Não foi possível carregar o cardápio.");
        if (cancelled) return;

        const productsBody = await productsRes.json();
        const catalog = ((productsBody.data ?? []) as CatalogProduct[]).filter(isSellable);
        setProducts(catalog);

        if (customersRes.ok) {
          const customersBody = await customersRes.json();
          const list = ((customersBody.data ?? []) as DeskCustomer[]).sort(byName);
          setAllCustomers(list);
          setCustomerResults(list);
        } else {
          // A busca ainda funciona; só a lista inicial fica vazia.
          setAllCustomers([]);
          setCustomerResults([]);
        }

        if (preOrderRes) {
          if (!preOrderRes.ok) throw new Error("Não foi possível carregar o pré-pedido.");
          const saved = await preOrderRes.json();
          if (cancelled) return;

          const discountCents = saved.discountCents ?? 0;
          setDiscountInput(formatCentsInput(discountCents));
          setDraft({
            id: saved.id,
            customerId: saved.customerId ?? null,
            notes: saved.notes ?? "",
            discountCents,
            items: (saved.items ?? []).map((item: any): DraftItem => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              priceCents: item.priceCents,
              // Chega como string: o Prisma serializa Decimal assim.
              weightKg: item.weightKg != null ? Number(item.weightKg) : null,
            })),
          });
          setCustomer(saved.customer ?? null);
          setTab("comanda");
        } else {
          setDraft(emptyDraft());
          setDiscountInput("");
          setCustomer(null);
          setTab("cardapio");
        }
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Falha ao carregar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, preOrderId]);

  // Fechar devolve a Mesa ao estado limpo: o próximo pedido não herda o anterior.
  useEffect(() => {
    if (open) return;
    setDraft(emptyDraft());
    setDiscountInput("");
    setCustomer(null);
    setSummary(null);
    setPresets([]);
    setCustomerQuery("");
    setAllCustomers([]);
    setCustomerResults([]);
    setBrowsingCustomers(false);
    setCatalogQuery("");
    setCategoryId(ALL_CATEGORIES);
    setLoadError(null);
  }, [open]);

  // ── Busca de cliente, com pausa para não disparar a cada tecla ──────────────
  useEffect(() => {
    if (!open) return;
    const term = customerQuery.trim();

    // Campo vazio volta ao cadastro inteiro que já está em memória. Sem isto,
    // limpar a busca deixava na tela o último resultado filtrado.
    if (!term) {
      setSearchingCustomers(false);
      setCustomerResults(allCustomers);
      return;
    }

    setSearchingCustomers(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/customers?q=${encodeURIComponent(term)}&page=1&size=${CUSTOMER_SEARCH_SIZE}`
        );
        if (!response.ok) throw new Error();
        const body = await response.json();
        setCustomerResults(((body.data ?? []) as DeskCustomer[]).sort(byName));
      } catch {
        setCustomerResults([]);
      } finally {
        setSearchingCustomers(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      setSearchingCustomers(false);
    };
  }, [customerQuery, open, allCustomers]);

  // ── Dossiê do cliente escolhido ────────────────────────────────────────────
  useEffect(() => {
    const id = customer?.id;
    if (!id) {
      setSummary(null);
      setPresets([]);
      return;
    }

    let cancelled = false;
    setSummary(null);
    setPresetsLoading(true);

    const load = async () => {
      const [summaryRes, presetsRes] = await Promise.all([
        fetch(`/api/customers/${id}/summary`),
        fetch(`/api/customers/${id}/presets`),
      ]);

      if (cancelled) return;

      // O dossiê é contexto, não bloqueio: se uma das partes falhar, a Mesa
      // segue funcionando e o campo apenas não afirma nada.
      if (summaryRes.ok) {
        const body = await summaryRes.json();
        if (!cancelled) setSummary(body.data ?? null);
      }
      if (presetsRes.ok) {
        const body = await presetsRes.json();
        if (!cancelled) setPresets((body.data ?? []) as CustomerPreset[]);
      } else if (!cancelled) {
        setPresets([]);
      }
      if (!cancelled) setPresetsLoading(false);
    };

    load().catch(() => {
      if (!cancelled) setPresetsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [customer?.id]);

  // ---------------------------------------------------------------------------
  // Ações sobre o rascunho
  // ---------------------------------------------------------------------------

  const productOf = useCallback(
    (productId: string) => products.find((product) => product.id === productId),
    [products]
  );

  /**
   * Sem toast de confirmação: a comanda fica ao lado e o item aparece nela na
   * hora — inclusive o campo de peso, em âmbar, para o produto vendido a quilo.
   * Um aviso flutuante aqui só taparia o rodapé para dizer o que já está à vista.
   */
  const handleAdd = useCallback((product: CatalogProduct) => {
    setDraft((current) => ({ ...current, items: addProductToItems(current.items, product) }));
  }, []);

  const handleSelectCustomer = useCallback((next: DeskCustomer) => {
    setCustomer(next);
    setDraft((current) => ({ ...current, customerId: next.id }));
    setCustomerQuery("");
    setBrowsingCustomers(false);
  }, []);

  const handleClearCustomer = useCallback(() => {
    setCustomer(null);
    setDraft((current) => ({ ...current, customerId: null }));
    setBrowsingCustomers(false);
  }, []);

  const handleApplyPreset = useCallback(() => {
    const result = applyPreset(draft.items, presets, products);
    if (result.added === 0) {
      showToast("Nenhum item do preset está disponível no cardápio.", "warning");
      return;
    }
    setDraft((current) => ({ ...current, items: result.items }));
    showToast(
      result.skipped > 0
        ? `${result.added} lançados · ${result.skipped} fora do cardápio`
        : `${result.added} ${result.added === 1 ? "item lançado" : "itens lançados"}`,
      result.skipped > 0 ? "warning" : "success"
    );
  }, [draft.items, presets, products, showToast]);

  const handleDiscount = useCallback(
    (raw: string) => {
      const capped = Math.min(parseCentsInput(raw), subtotalOf(draft.items));
      setDiscountInput(formatCentsInput(capped));
      setDraft((current) => ({ ...current, discountCents: capped }));
    },
    [draft.items]
  );

  // O desconto nunca pode passar do subtotal: tirar itens tem de puxá-lo junto.
  useEffect(() => {
    const subtotal = subtotalOf(draft.items);
    if (draft.discountCents <= subtotal) return;
    setDiscountInput(formatCentsInput(subtotal));
    setDraft((current) => ({ ...current, discountCents: subtotal }));
  }, [draft.items, draft.discountCents]);

  // ---------------------------------------------------------------------------
  // Salvar
  // ---------------------------------------------------------------------------

  const invalidWeight = useMemo(() => {
    return draft.items.some(
      (item) => item.weightKg !== null && validateWeightKg(item.weightKg) !== null
    );
  }, [draft.items]);

  const overStock = useMemo(
    () => productsOverStock(draft.items, products),
    [draft.items, products]
  );

  const save = useCallback(
    async (print: boolean) => {
      if (draft.items.length === 0 || invalidWeight) return;
      setSaving(true);

      try {
        const response = await fetch("/api/pre-orders", {
          method: draft.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(draft.id && { id: draft.id }),
            customerId: draft.customerId,
            notes: draft.notes.trim() || null,
            discountCents: draft.discountCents,
            deliveryFeeCents: 0,
            items: draft.items.map((item) => ({
              ...(item.id && { id: item.id }),
              productId: item.productId,
              quantity: item.quantity,
              priceCents: item.priceCents,
              weightKg: item.weightKg,
            })),
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "Não foi possível salvar o pré-pedido.");
        }

        const saved = await response.json();
        showToast(draft.id ? "Pré-pedido atualizado." : "Pré-pedido criado.", "success");
        onOpenChange(false);
        onSaved?.({ id: saved.id ?? draft.id ?? "", print });
      } catch (error) {
        // A Mesa continua aberta: o operador corrige e tenta de novo sem refazer nada.
        showToast(
          error instanceof Error ? error.message : "Não foi possível salvar o pré-pedido.",
          "error"
        );
      } finally {
        setSaving(false);
      }
    },
    [draft, invalidWeight, onOpenChange, onSaved, showToast]
  );

  const subtotal = subtotalOf(draft.items);
  const total = totalOf(draft);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const columnVisible = (name: Tab) => (tab === name ? "flex" : "hidden lg:flex");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/*
          Acima do balão do assistente (z-90) e do aviso de impressão (z-100).
          O Radix já deixa o resto do admin inerte, mas inerte e invisível não
          são a mesma coisa: em tela cheia o balão pousava em cima do botão de
          salvar.
        */}
        <DialogOverlay className="z-[109]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="fixed inset-0 z-[110] flex flex-col bg-[color:var(--card)] text-[color:var(--foreground)] duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <DialogPrimitive.Title className="sr-only">
            {editing ? "Editar pré-pedido" : "Novo pré-pedido"}
          </DialogPrimitive.Title>

          <Header
            editing={editing}
            total={total}
            itemCount={draft.items.length}
            onClose={() => onOpenChange(false)}
            disabled={saving}
          />

          {/* Abas só existem quando as três colunas não cabem lado a lado. */}
          <div
            role="tablist"
            aria-label="Seções da mesa"
            className="flex gap-px border-b border-[color:var(--border)] bg-[color:var(--border)] lg:hidden"
          >
            {(
              [
                ["cliente", "Cliente", customer ? customer.name : "Opcional"],
                ["cardapio", "Cardápio", `${products.length} produtos`],
                ["comanda", "Comanda", `${draft.items.length} itens · ${formatCurrency(total)}`],
              ] as const
            ).map(([key, label, hint]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex-1 bg-[color:var(--card)] px-2 py-2 text-center transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--ring)]",
                  tab === key
                    ? "bg-[color:var(--primary-lighter)] shadow-[inset_0_-2px_0_var(--primary)]"
                    : "hover:bg-[color:var(--muted)]"
                )}
              >
                <span className="block text-[12.5px] font-semibold">{label}</span>
                <span className="block truncate text-[10.5px] tabular-nums text-[color:var(--muted-foreground)]">
                  {hint}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <DeskLoading />
          ) : loadError ? (
            <DeskError message={loadError} onClose={() => onOpenChange(false)} />
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)_336px] xl:grid-cols-[300px_minmax(0,1fr)_384px]">
              <div
                className={cn(
                  "min-h-0 flex-col border-[color:var(--border)] lg:border-r",
                  columnVisible("cliente")
                )}
              >
                <OrderDeskCustomer
                  results={customerResults}
                  searching={searchingCustomers}
                  query={customerQuery}
                  onQueryChange={setCustomerQuery}
                  selected={customer}
                  summary={summary}
                  presets={presets}
                  presetsLoading={presetsLoading}
                  products={products}
                  onSelect={handleSelectCustomer}
                  onClear={handleClearCustomer}
                  onApplyPreset={handleApplyPreset}
                  onAddProduct={handleAdd}
                  browsing={browsingCustomers}
                  onBrowse={setBrowsingCustomers}
                  disabled={saving}
                />
              </div>

              <div className={cn("min-h-0 flex-col", columnVisible("cardapio"))}>
                <OrderDeskCatalog
                  products={products}
                  items={draft.items}
                  query={catalogQuery}
                  onQueryChange={setCatalogQuery}
                  categoryId={categoryId}
                  onCategoryChange={setCategoryId}
                  onAdd={handleAdd}
                  disabled={saving}
                />
              </div>

              <div
                className={cn(
                  "min-h-0 flex-col border-[color:var(--border)] bg-[color:var(--card)] lg:border-l",
                  columnVisible("comanda")
                )}
              >
                <Comanda
                  draft={draft}
                  products={products}
                  subtotal={subtotal}
                  total={total}
                  discountInput={discountInput}
                  overStock={overStock}
                  saving={saving}
                  onDiscountChange={handleDiscount}
                  onNotesChange={(notes) => setDraft((current) => ({ ...current, notes }))}
                  onQuantityChange={(index, quantity) =>
                    setDraft((current) => ({
                      ...current,
                      items: setQuantity(current.items, index, quantity),
                    }))
                  }
                  onWeightChange={(index, raw) =>
                    setDraft((current) => ({
                      ...current,
                      items: setWeight(
                        current.items,
                        index,
                        parseWeightInput(raw),
                        raw,
                        productOf(current.items[index]?.productId ?? "")
                      ),
                    }))
                  }
                  onWeightBlur={(index) =>
                    setDraft((current) => ({
                      ...current,
                      items: current.items.map((item, i) =>
                        i === index ? { ...item, weightDraft: undefined } : item
                      ),
                    }))
                  }
                  onRemove={(index) =>
                    setDraft((current) => ({
                      ...current,
                      items: removeItem(current.items, index),
                    }))
                  }
                />
              </div>
            </div>
          )}

          <footer className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3">
            <p className="text-[12.5px] tabular-nums text-[color:var(--muted-foreground)]">
              {draft.items.length === 0
                ? "Adicione ao menos 1 item"
                : `${draft.items.length} ${draft.items.length === 1 ? "item" : "itens"} · ${formatCurrency(total)}`}
            </p>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => save(true)}
                disabled={saving || draft.items.length === 0 || invalidWeight}
                leftIcon={<Printer className="h-4 w-4" />}
                title="Salva o pré-pedido e manda a comanda para a impressora"
              >
                Salvar e Imprimir
              </Button>
              <Button
                onClick={() => save(false)}
                loading={saving}
                disabled={saving || draft.items.length === 0 || invalidWeight}
                leftIcon={saving ? undefined : <Save className="h-4 w-4" />}
              >
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </footer>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

// =============================================================================
// CABEÇALHO
// =============================================================================

function Header({
  editing,
  total,
  itemCount,
  onClose,
  disabled,
}: {
  editing: boolean;
  total: number;
  itemCount: number;
  onClose: () => void;
  disabled: boolean;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-[color:var(--border)] px-4 py-3">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
        <ClipboardList className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-semibold leading-tight">
          {editing ? "Editar pré-pedido" : "Mesa de pedido"}
        </h2>
        <p className="truncate text-[12px] text-[color:var(--muted-foreground)]">
          Cliente · Cardápio · Comanda — o pedido nasce com a cara que vai ter depois de salvo
        </p>
      </div>

      <div className="flex flex-none flex-col items-end">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--muted-foreground)]">
          Total
        </span>
        <span
          className={cn(
            "text-[19px] font-bold leading-tight tabular-nums",
            itemCount > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-[color:var(--muted-foreground)]"
          )}
        >
          {formatCurrency(total)}
        </span>
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        aria-label="Fechar"
        className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)] disabled:opacity-50"
      >
        <X className="h-4.5 w-4.5" />
      </button>
    </header>
  );
}

// =============================================================================
// COMANDA
// =============================================================================

type ComandaProps = {
  draft: Draft;
  products: CatalogProduct[];
  subtotal: number;
  total: number;
  discountInput: string;
  overStock: CatalogProduct[];
  saving: boolean;
  onDiscountChange: (raw: string) => void;
  onNotesChange: (notes: string) => void;
  onQuantityChange: (index: number, quantity: number) => void;
  onWeightChange: (index: number, raw: string) => void;
  onWeightBlur: (index: number) => void;
  onRemove: (index: number) => void;
};

function Comanda({
  draft,
  products,
  subtotal,
  total,
  discountInput,
  overStock,
  saving,
  onDiscountChange,
  onNotesChange,
  onQuantityChange,
  onWeightChange,
  onWeightBlur,
  onRemove,
}: ComandaProps) {
  return (
    <>
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        <p className="flex items-center gap-2 pb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--muted-foreground-strong)]">
          Comanda{draft.items.length > 0 && ` · ${draft.items.length}`}
          <span aria-hidden="true" className="h-px flex-1 bg-[color:var(--border)]" />
        </p>

        {overStock.length > 0 && (
          <p className="mb-2.5 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11.5px] leading-snug text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <span>
              {overStock.length === 1
                ? "1 produto acima do estoque."
                : `${overStock.length} produtos acima do estoque.`}{" "}
              O pré-pedido salva normalmente, mas a conversão em venda vai falhar enquanto o
              saldo não cobrir.
            </span>
          </p>
        )}

        {draft.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[color:var(--border)] px-4 py-9 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--muted)]">
              <Package className="h-5 w-5 text-[color:var(--muted-foreground)]" />
            </span>
            <span className="text-[12.5px] font-semibold text-[color:var(--muted-foreground-strong)]">
              A comanda está vazia
            </span>
            <span className="max-w-[30ch] text-[11.5px] text-[color:var(--muted-foreground)]">
              Escolha os produtos no cardápio. O cupom aqui embaixo se monta sozinho.
            </span>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {draft.items.map((item, index) => (
              <ItemRow
                key={item.id ?? `${item.productId}-${index}`}
                item={item}
                index={index}
                product={products.find((product) => product.id === item.productId)}
                saving={saving}
                onQuantityChange={onQuantityChange}
                onWeightChange={onWeightChange}
                onWeightBlur={onWeightBlur}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}

        {/*
          A observação sai impressa na comanda e é o que a cozinha lê antes de
          montar o prato. Fica num quadro próprio, e preenchida ela acende em
          âmbar — do mesmo tom do bilhete colado no pedido.
        */}
        <label
          className={cn(
            "mt-3 block overflow-hidden rounded-xl border-2 transition-all",
            "focus-within:ring-2 focus-within:ring-[color:var(--primary-lighter)]",
            draft.notes.trim()
              ? "[border-color:var(--state-pronto)] [background:var(--state-pronto-bg)]"
              : "border-dashed border-[color:var(--border-dark)] bg-[color:var(--card)] focus-within:border-solid focus-within:border-primary"
          )}
        >
          <span
            className={cn(
              "flex items-center gap-1.5 px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.1em]",
              draft.notes.trim()
                ? "[color:var(--state-pronto-fg)]"
                : "text-[color:var(--muted-foreground-strong)]"
            )}
          >
            <StickyNote className="h-3.5 w-3.5" />
            Observações
            <span className="font-normal normal-case tracking-normal opacity-70">
              — vai impressa na comanda
            </span>
          </span>
          <textarea
            value={draft.notes}
            onChange={(event) => onNotesChange(event.target.value)}
            disabled={saving}
            rows={3}
            placeholder="Sem cebola, entregar às 11h…"
            className={cn(
              "min-h-[62px] w-full resize-none border-0 bg-transparent px-3 pb-2.5 text-[13px] leading-snug outline-none",
              "placeholder:text-[color:var(--muted-foreground)]",
              draft.notes.trim() && "font-medium [color:var(--state-pronto-fg)]"
            )}
          />
        </label>
      </div>

      <div className="flex-none border-t border-[color:var(--border)] px-3.5 py-2.5 shadow-[0_-8px_14px_-12px_rgb(15_23_42/0.5)]">
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px] text-[color:var(--muted-foreground)]">
            <span>Subtotal</span>
            <b className="font-semibold tabular-nums text-[color:var(--foreground)]">
              {formatCurrency(subtotal)}
            </b>
          </div>

          <label className="flex items-center justify-between gap-2 border-t border-[color:var(--border)] px-3 py-2 text-[12.5px] text-[color:var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Desconto
            </span>
            <span className="flex h-7 w-[112px] items-center gap-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-2 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-[color:var(--primary-lighter)]">
              <span className="text-[11.5px]">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={discountInput}
                onChange={(event) => onDiscountChange(event.target.value)}
                disabled={saving || subtotal === 0}
                placeholder="0,00"
                aria-label="Desconto em reais"
                className="w-full border-0 bg-transparent text-right text-[12.5px] font-semibold tabular-nums text-[color:var(--foreground)] outline-none disabled:cursor-not-allowed"
              />
            </span>
          </label>

          <div className="flex items-center justify-between gap-2 border-t border-[color:var(--border)] px-3 py-2.5 [background:var(--state-faturado-bg)]">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] [color:var(--state-faturado-fg)]">
              Total
            </span>
            <b className="text-[21px] font-bold leading-none tabular-nums [color:var(--state-faturado-fg)]">
              {formatCurrency(total)}
            </b>
          </div>
        </div>
      </div>
    </>
  );
}

function ItemRow({
  item,
  index,
  product,
  saving,
  onQuantityChange,
  onWeightChange,
  onWeightBlur,
  onRemove,
}: {
  item: DraftItem;
  index: number;
  product: CatalogProduct | undefined;
  saving: boolean;
  onQuantityChange: (index: number, quantity: number) => void;
  onWeightChange: (index: number, raw: string) => void;
  onWeightBlur: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const byWeight = item.weightKg !== null || (product ? isWeightBasedProduct(product) : false);
  const pricePerKg = Number(product?.pricePerKgCents ?? 0);
  const weightError = byWeight ? validateWeightKg(item.weightKg) : null;

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-[color:var(--card)] px-2.5 py-2",
        weightError ? "border-rose-400 dark:border-rose-600" : "border-[color:var(--border)]"
      )}
    >
      <span className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-lg bg-[color:var(--muted)]">
        {product?.imageUrl ? (
          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Package className="h-4 w-4 text-[color:var(--muted-foreground)]" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[12.5px] font-medium leading-tight">
          {product?.name ?? "Produto não encontrado"}
        </span>
        <span className="block truncate text-[10.5px] tabular-nums text-[color:var(--muted-foreground)]">
          {byWeight
            ? `${formatCurrency(pricePerKg)}/kg`
            : `${formatCurrency(item.priceCents)} /un.`}
        </span>
        {weightError && (
          <span className="block text-[10.5px] font-semibold text-rose-600 dark:text-rose-400">
            {weightError}
          </span>
        )}
      </span>

      {byWeight ? (
        <span
          className={cn(
            "flex h-7 flex-none items-center gap-1 rounded-lg border px-2 text-[11.5px] font-bold",
            "[border-color:var(--state-pronto)] [background:var(--state-pronto-bg)] [color:var(--state-pronto-fg)]",
            "focus-within:ring-2 focus-within:ring-[color:var(--primary-lighter)]"
          )}
        >
          <Scale className="h-3.5 w-3.5" />
          <input
            type="text"
            inputMode="decimal"
            value={item.weightDraft ?? (item.weightKg !== null ? formatWeightKg(item.weightKg) : "")}
            onChange={(event) => onWeightChange(index, event.target.value)}
            onBlur={() => onWeightBlur(index)}
            disabled={saving}
            aria-label={`Peso de ${product?.name ?? "item"} em quilos`}
            className="w-[46px] border-0 bg-transparent text-right font-bold tabular-nums text-inherit outline-none"
          />
          <span>kg</span>
        </span>
      ) : (
        <span className="flex flex-none items-center gap-0.5 rounded-lg border border-[color:var(--border)] p-0.5">
          <button
            type="button"
            onClick={() => onQuantityChange(index, item.quantity - 1)}
            disabled={saving}
            aria-label="Diminuir quantidade"
            className="flex h-6 w-6 items-center justify-center rounded-md text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--primary-lighter)] hover:text-primary disabled:opacity-40"
          >
            <span aria-hidden="true" className="text-[13px] font-bold leading-none">
              −
            </span>
          </button>
          <span className="min-w-[22px] text-center text-[12px] font-bold tabular-nums">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onQuantityChange(index, item.quantity + 1)}
            disabled={saving}
            aria-label="Aumentar quantidade"
            className="flex h-6 w-6 items-center justify-center rounded-md text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--primary-lighter)] hover:text-primary disabled:opacity-40"
          >
            <span aria-hidden="true" className="text-[13px] font-bold leading-none">
              +
            </span>
          </button>
        </span>
      )}

      <span className="w-[68px] flex-none text-right text-[12.5px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
        {formatCurrency(lineTotal(item))}
      </span>

      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={saving}
        aria-label={`Remover ${product?.name ?? "item"}`}
        className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[color:var(--muted-foreground)] transition-colors hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

// =============================================================================
// ESTADOS DE CARGA
// =============================================================================

function DeskLoading() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-[13px] text-[color:var(--muted-foreground)]">Abrindo a mesa…</p>
      </div>
    </div>
  );
}

function DeskError({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="text-[14px] font-semibold">{message}</p>
        <p className="text-[12.5px] text-[color:var(--muted-foreground)]">
          Nada foi alterado. Feche e tente de novo.
        </p>
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
