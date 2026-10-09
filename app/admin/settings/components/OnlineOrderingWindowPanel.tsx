"use client";

import { Button } from "@/app/components/ui/button";
import { DialogOverlay } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Switch } from "@/app/components/ui/switch";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertCircle, CalendarClock, Check, Copy, Info, Search, Trash2, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  findOverlaps,
  formatMinute,
  formatPrice,
  hasErrors,
  minuteLabel,
  minuteOptions,
  plural,
  serializeWindows,
  SWITCH_OFF_CLASS,
  validateDraft,
  WEEKDAY_CHIPS,
  type DraftWindow,
  type OOProduct,
} from "./OnlineOrderingShared";

interface Props {
  window: DraftWindow;
  /** Horário ainda não salvo (novo, modelo ou cópia). */
  isNew: boolean;
  products: OOProduct[];
  /** Os outros horários já salvos, para avisar de sobreposição. */
  others: DraftWindow[];
  /** "Horário 1 de 2" quando um modelo cria vários de uma vez. */
  step?: { index: number; total: number };
  saving: boolean;
  error: string | null;
  onSave: (draft: DraftWindow) => void;
  onClose: () => void;
  onRemove?: () => void;
  onDuplicate?: (draft: DraftWindow) => void;
}

const DAY_SHORTCUTS: { label: string; days: number[] }[] = [
  { label: "Seg a sex", days: [1, 2, 3, 4, 5] },
  { label: "Todos os dias", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Fim de semana", days: [6, 0] },
];

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function hoursText(start: number, end: number): string {
  const minutes = end - start;
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} minutos`;
  return m === 0 ? `${h} ${h === 1 ? "hora" : "horas"}` : `${h} h ${m} min`;
}

function ProductPhoto({ product }: { product: OOProduct }) {
  return product.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.imageUrl}
      alt=""
      loading="lazy"
      className="h-9 w-9 flex-shrink-0 rounded-lg border border-[color:var(--border)] object-cover"
    />
  ) : (
    <span
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--muted)] text-xs font-semibold text-[color:var(--muted-foreground)]"
      aria-hidden="true"
    >
      {product.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function OnlineOrderingWindowPanel({
  window: initial,
  isNew,
  products,
  others,
  step,
  saving,
  error,
  onSave,
  onClose,
  onRemove,
  onDuplicate,
}: Props) {
  const uid = useId();
  const [draft, setDraft] = useState<DraftWindow>(initial);
  const [query, setQuery] = useState("");
  const [tried, setTried] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const eligibleIds = useMemo(() => new Set(products.filter((p) => p.eligible).map((p) => p.id)), [products]);
  const errors = validateDraft(draft, eligibleIds);
  const invalid = hasErrors(errors);
  const touched = serializeWindows([draft]) !== serializeWindows([initial]);
  const selected = useMemo(() => new Set(draft.productIds), [draft.productIds]);

  const overlapsWith = useMemo(() => {
    const merged = [...others.filter((o) => o.key !== draft.key), draft];
    return [...new Set(findOverlaps(merged).get(draft.key) ?? [])];
  }, [others, draft]);

  const patch = (p: Partial<DraftWindow>) => setDraft((d) => ({ ...d, ...p }));
  const setDays = (days: number[]) => patch({ weekdays: days });
  const toggleDay = (day: number) =>
    setDraft((d) => ({
      ...d,
      weekdays: d.weekdays.includes(day) ? d.weekdays.filter((x) => x !== day) : [...d.weekdays, day],
    }));

  const toggleProduct = (id: string) =>
    setDraft((d) => ({
      ...d,
      productIds: d.productIds.includes(id) ? d.productIds.filter((x) => x !== id) : [...d.productIds, id],
    }));

  const groups = useMemo(() => {
    const needle = fold(query.trim());
    const map = new Map<string, { id: string; name: string; items: OOProduct[] }>();
    for (const p of products) {
      const gid = p.category?.id ?? "__none";
      if (!map.has(gid)) map.set(gid, { id: gid, name: p.category?.name ?? "Sem categoria", items: [] });
      map.get(gid)!.items.push(p);
    }
    return [...map.values()]
      .sort((a, b) => (a.id === "__none" ? 1 : b.id === "__none" ? -1 : a.name.localeCompare(b.name, "pt-BR")))
      .map((g) => ({ ...g, items: needle ? g.items.filter((p) => fold(p.name).includes(needle)) : g.items }))
      .filter((g) => g.items.length > 0);
  }, [products, query]);

  const markGroup = (items: OOProduct[], value: boolean) =>
    setDraft((d) => {
      const next = new Set(d.productIds);
      for (const p of items) {
        if (!p.eligible) continue;
        if (value) next.add(p.id);
        else next.delete(p.id);
      }
      return { ...d, productIds: [...next] };
    });

  const requestClose = () => {
    if (saving) return;
    if (touched && !confirmDiscard) setConfirmDiscard(true);
    else onClose();
  };

  const submit = () => {
    setTried(true);
    if (invalid || saving) return;
    onSave(draft);
  };

  const showProductsError = Boolean(errors.products) && (tried || draft.productIds.length > 0);
  const total = products.filter((p) => p.eligible).length;
  const pickedCount = draft.productIds.filter((id) => eligibleIds.has(id)).length;

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && requestClose()}>
      <DialogPrimitive.Portal>
        <DialogOverlay className="z-[95]" />
        <DialogPrimitive.Content
          className="fixed bottom-0 right-0 top-0 z-[96] flex w-full flex-col bg-[color:var(--card)] shadow-2xl duration-200 focus:outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-[520px] sm:border-l sm:border-[color:var(--border)]"
        >
          <header className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-lg font-bold leading-tight text-[color:var(--foreground)]">
                  {isNew ? "Novo horário" : "Editar horário"}
                  {step && step.total > 1 && (
                    <span className="ml-2 text-sm font-medium text-[color:var(--muted-foreground)]">
                      {step.index} de {step.total}
                    </span>
                  )}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">
                  Vale para o cliente assim que você salvar.
                </DialogPrimitive.Description>
              </div>
            </div>
            <Button type="button" variant="outline" className="min-h-[44px] min-w-[44px] px-0" onClick={requestClose} aria-label="Fechar">
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </header>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            {/* Nome e ativo */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[12rem] flex-1">
                <label htmlFor={`${uid}-name`} className="mb-2 block text-sm font-bold text-[color:var(--foreground)]">
                  Nome do horário
                </label>
                <Input
                  id={`${uid}-name`}
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Ex.: Almoço"
                  maxLength={60}
                  autoComplete="off"
                  className="min-h-[44px]"
                  aria-invalid={Boolean(errors.name) && tried}
                />
                {errors.name && tried && <p className="mt-1.5 text-sm font-medium" style={{ color: "var(--state-cobrar-fg)" }}>{errors.name}</p>}
              </div>
              <div className="flex min-h-[44px] items-center gap-2">
                <Switch
                  id={`${uid}-active`}
                  checked={draft.active}
                  className={SWITCH_OFF_CLASS}
                  onCheckedChange={(v) => patch({ active: v })}
                />
                <label htmlFor={`${uid}-active`} className="cursor-pointer text-sm text-[color:var(--foreground)]">
                  {draft.active ? "Ativo" : "Inativo"}
                </label>
              </div>
            </div>

            {/* Dias */}
            <div role="group" aria-labelledby={`${uid}-days`}>
              <p id={`${uid}-days`} className="mb-2 text-sm font-bold text-[color:var(--foreground)]">
                Dias da semana
              </p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_CHIPS.map((d) => {
                  const on = draft.weekdays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      aria-pressed={on}
                      aria-label={d.full}
                      onClick={() => toggleDay(d.value)}
                      className={cn(
                        "min-h-[44px] min-w-[52px] rounded-xl border px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        on
                          ? "border-primary bg-primary text-white"
                          : "border-[color:var(--border-dark)] bg-[color:var(--card)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]"
                      )}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {DAY_SHORTCUTS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setDays(s.days)}
                    className="min-h-[36px] rounded-full border border-[color:var(--border)] bg-[color:var(--muted)]/60 px-3 text-xs font-semibold text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {errors.weekdays && (
                <p className="mt-2 text-sm font-medium" style={{ color: "var(--state-cobrar-fg)" }} role="alert">
                  {errors.weekdays}
                </p>
              )}
            </div>

            {/* Horas */}
            <div>
              <p className="mb-2 text-sm font-bold text-[color:var(--foreground)]">Horário de pedidos</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[color:var(--foreground)]">das</span>
                <Select value={String(draft.startMinute)} onValueChange={(v) => patch({ startMinute: Number(v) })}>
                  <SelectTrigger className="min-h-[44px] w-[120px]" aria-label="Hora em que abre">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions("start", draft.startMinute).map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {minuteLabel("start", m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-[color:var(--foreground)]">às</span>
                <Select value={String(draft.endMinute)} onValueChange={(v) => patch({ endMinute: Number(v) })}>
                  <SelectTrigger className="min-h-[44px] w-[150px] max-w-full sm:w-[185px]" aria-label="Hora em que fecha">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions("end", draft.endMinute).map((m) => (
                      <SelectItem key={m} value={String(m)} disabled={m <= draft.startMinute && m !== draft.endMinute}>
                        {minuteLabel("end", m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.time ? (
                <p className="mt-2 text-sm font-medium" style={{ color: "var(--state-cobrar-fg)" }} role="alert">
                  {errors.time}
                </p>
              ) : (
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  O cliente pode pedir {hoursText(draft.startMinute, draft.endMinute)} por dia ({formatMinute(draft.startMinute)} às{" "}
                  {formatMinute(draft.endMinute)}). Pedido que chega até 3 minutos depois de fechar ainda entra. Para atravessar a
                  meia-noite, crie dois horários.
                </p>
              )}
              {overlapsWith.length > 0 && (
                <p
                  role="status"
                  className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--state-producao-bg)", color: "var(--state-producao-fg)" }}
                >
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>
                    Este horário se sobrepõe a {overlapsWith.map((n) => `“${n}”`).join(", ")} em algum dia. Tudo bem: os
                    produtos ficam disponíveis enquanto qualquer um dos horários estiver aberto.
                  </span>
                </p>
              )}
            </div>

            {/* Produtos */}
            <div>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-[color:var(--foreground)]">Produtos deste horário</p>
                <p className="text-sm font-bold text-primary" aria-live="polite">
                  {pickedCount} de {total} marcados
                </p>
              </div>
              <label htmlFor={`${uid}-search`} className="sr-only">
                Buscar produto pelo nome
              </label>
              <Input
                id={`${uid}-search`}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produto"
                leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
                className="min-h-[44px]"
                autoComplete="off"
              />
              {showProductsError && (
                <p className="mt-2 text-sm font-medium" style={{ color: "var(--state-cobrar-fg)" }} role="alert">
                  {errors.products}
                </p>
              )}
              {groups.length === 0 ? (
                <p className="py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                  {products.length === 0 ? "Nenhum produto cadastrado." : "Nenhum produto com esse nome."}
                </p>
              ) : (
                <div className="mt-1">
                  {groups.map((g) => {
                    const eligibleItems = g.items.filter((p) => p.eligible);
                    const allChosen = eligibleItems.length > 0 && eligibleItems.every((p) => selected.has(p.id));
                    return (
                      <section key={g.id} aria-labelledby={`${uid}-cat-${g.id}`}>
                        <div className="flex items-center justify-between gap-2 pb-1 pt-3">
                          <h4
                            id={`${uid}-cat-${g.id}`}
                            className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]"
                          >
                            {g.name}
                          </h4>
                          {eligibleItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => markGroup(g.items, !allChosen)}
                              className="min-h-[36px] px-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label={`${allChosen ? "Limpar" : "Marcar todos de"} ${g.name}`}
                            >
                              {allChosen ? "Limpar" : "Marcar todos"}
                            </button>
                          )}
                        </div>
                        <ul>
                          {g.items.map((p) => {
                            const on = selected.has(p.id);
                            return (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={on}
                                  disabled={!p.eligible}
                                  onClick={() => toggleProduct(p.id)}
                                  className={cn(
                                    "flex min-h-[52px] w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
                                    on ? "bg-primary/5" : "hover:bg-[color:var(--muted)]"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-md border-2",
                                      on ? "border-primary bg-primary text-white" : "border-[color:var(--border-dark)]"
                                    )}
                                    aria-hidden="true"
                                  >
                                    {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                  </span>
                                  <ProductPhoto product={p} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-[color:var(--foreground)]">{p.name}</span>
                                    <span className="block text-xs text-[color:var(--muted-foreground)]">
                                      {p.eligible ? formatPrice(p.priceCents) : (p.reason ?? "Não disponível para pedido online")}
                                      {p.eligible && p.stockEnabled && p.stock <= 0 ? " · sem estoque" : ""}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 flex items-start gap-2 text-xs text-[color:var(--muted-foreground)]">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                Preço e estoque vêm do cadastro de Produtos.
              </p>
            </div>
          </div>

          <footer className="border-t border-[color:var(--border)] bg-[color:var(--card)] px-5 py-3.5 sm:px-6">
            {error && (
              <p role="alert" className="mb-3 flex items-start gap-2 text-sm font-medium" style={{ color: "var(--state-cobrar-fg)" }}>
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
            {confirmDiscard ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p role="alert" className="text-sm font-medium text-[color:var(--foreground)]">
                  Fechar sem salvar? O que você mexeu será perdido.
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setConfirmDiscard(false)}>
                    Continuar editando
                  </Button>
                  <Button type="button" variant="destructive" className="min-h-[44px]" onClick={onClose}>
                    Descartar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="order-2 flex items-center gap-1 sm:order-1">
                  {!isNew && onRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-[44px]"
                      style={{ color: "var(--state-cobrar-fg)" }}
                      onClick={onRemove}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remover
                    </Button>
                  )}
                  {!isNew && onDuplicate && (
                    <Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => onDuplicate(draft)} disabled={saving}>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Duplicar
                    </Button>
                  )}
                </div>
                <span className="hidden flex-1 sm:order-2 sm:block" />
                <div className="order-1 flex items-center gap-2 sm:order-3">
                  <Button type="button" variant="outline" className="min-h-[44px] flex-1 sm:flex-none" onClick={requestClose} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button type="button" className="min-h-[44px] flex-1 sm:flex-none" onClick={submit} loading={saving}>
                    {saving ? "Salvando..." : step && step.index < step.total ? "Salvar e continuar" : "Salvar horário"}
                  </Button>
                </div>
              </div>
            )}
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
