"use client";

import { EmptyState } from "@/app/admin/components/data-display/EmptyState";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  MapPin,
  MoreVertical,
  Pencil,
  Printer,
  Receipt,
  Scale,
  StickyNote,
  Store,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import {
  formatCurrency,
  formatDateTime,
  formatWhen,
  fulfillmentOf,
  initialsOf,
  stageOf,
  stageVars,
  weightOf,
  type Fulfillment,
  type PreOrder,
} from "../lib/preOrderView";
import { PreOrderTimeline } from "./PreOrderTimeline";
import { ReceivePanel, type PaymentMethod } from "./ReceivePanel";
import { StagePicker } from "./StagePicker";
import { ThermalTicket } from "./ThermalTicket";

type Action =
  | { kind: "status"; next: string; label: string; icon: typeof Truck }
  | { kind: "receive"; label: string; icon: typeof Truck };

/**
 * As ações que fazem o pedido andar.
 *
 * O dinheiro entra num lugar só: a etapa "A cobrar". Todas as etapas anteriores
 * apenas empurram o pedido — a produção despacha (rota ou balcão), a retirada
 * marca que o cliente levou, a rota marca que chegou. Assim não existe um botão
 * de cobrança no meio do caminho, e o pedido nunca fica entregue sem passar
 * pela fila de cobrança. Quando a modalidade é desconhecida (o caso comum,
 * porque o schema não a registra), a tela oferece as duas saídas da produção em
 * vez de adivinhar qual delas o operador queria.
 */
function actionsFor(preOrder: PreOrder): { primary: Action | null; secondary: Action | null } {
  const stage = stageOf(preOrder);
  const fulfillment = fulfillmentOf(preOrder);

  const receive: Action = { kind: "receive", label: "Receber", icon: Wallet };
  const toDelivery: Action = {
    kind: "status",
    next: "out_for_delivery",
    label: "Despachar para entrega",
    icon: Truck,
  };
  const toPickup: Action = {
    kind: "status",
    next: "ready",
    label: "Despachar para retirada",
    icon: Store,
  };

  switch (stage) {
    case "fila":
      return {
        primary: { kind: "status", next: "preparing", label: "Enviar para a cozinha", icon: Printer },
        secondary: null,
      };
    case "producao":
      return fulfillment === "pickup"
        ? { primary: toPickup, secondary: toDelivery }
        : { primary: toDelivery, secondary: toPickup };
    case "pronto":
      return {
        primary: { kind: "status", next: "delivered", label: "Marcar como retirado", icon: CheckCircle2 },
        secondary: null,
      };
    case "rota":
      return {
        primary: { kind: "status", next: "delivered", label: "Marcar como entregue", icon: CheckCircle2 },
        secondary: null,
      };
    case "cobrar":
      return { primary: receive, secondary: null };
    default:
      return { primary: null, secondary: null };
  }
}

interface PreOrderDossierProps {
  preOrder: PreOrder;
  now: Date;
  receiving: boolean;
  converting: boolean;
  advancing: boolean;
  onStartReceive: () => void;
  onCancelReceive: () => void;
  onConfirmReceive: (input: { paymentMethod: PaymentMethod; cashReceived?: number; change?: number }) => void;
  onAdvance: (nextStatus: string) => void;
  onPrint: () => void;
  onEdit: () => void;
  onTrack: () => void;
  onDelete: () => void;
}

type Tab = "itens" | "historico" | "entrega";

export function PreOrderDossier({
  preOrder,
  now,
  receiving,
  converting,
  advancing,
  onStartReceive,
  onCancelReceive,
  onConfirmReceive,
  onAdvance,
  onPrint,
  onEdit,
  onTrack,
  onDelete,
}: PreOrderDossierProps) {
  const [tab, setTab] = useState<Tab>("itens");
  const stage = stageOf(preOrder);
  const fulfillment = fulfillmentOf(preOrder);
  const { primary, secondary } = actionsFor(preOrder);
  const due = stage === "cobrar";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[color:var(--background)]" style={stageVars(stage)}>
      <header className="flex items-start gap-3.5 border-b border-[color:var(--border)] bg-[color:var(--card)] px-5 py-4">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] text-[15px] font-bold"
          style={{ background: "var(--st-bg)", color: "var(--st-fg)" }}
        >
          {preOrder.customer ? initialsOf(preOrder.customer.name) : "—"}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold tracking-tight text-[color:var(--foreground)]">
            {preOrder.customer?.name ?? "Venda avulsa"}
          </h2>

          <p className="mt-1.5 truncate font-mono text-xs text-[color:var(--muted-foreground-strong)]">
            {[
              preOrder.customer?.phone,
              `#${preOrder.id.slice(-4).toUpperCase()}`,
              `anotado ${formatWhen(preOrder.createdAt, now)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {/* A observação sobe para o cabeçalho: é instrução de entrega, não histórico. */}
          {preOrder.notes?.trim() && (
            <p
              className="mt-2 flex items-start gap-2 rounded-lg border border-l-[3px] border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-[12.5px] leading-snug text-[color:var(--foreground)]"
              style={{ borderLeftColor: "var(--state-pronto)" }}
            >
              <StickyNote
                className="mt-0.5 h-3.5 w-3.5 flex-none text-[color:var(--muted-foreground-strong)]"
                aria-hidden="true"
              />
              <span className="min-w-0">{preOrder.notes}</span>
            </p>
          )}
        </div>

        {/* Etapa e modalidade empilhadas, ao lado do bloco de identificação. */}
        <div className="flex flex-none flex-col items-start gap-2 self-center">
          <StagePicker stage={stage} disabled={advancing || receiving} onChange={onAdvance} />
          {fulfillment !== "unknown" && (
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-[color:var(--border)] px-3.5 text-[13px] font-bold text-[color:var(--muted-foreground-strong)]">
              {fulfillment === "pickup" ? <Store className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
              {fulfillment === "pickup" ? "Balcão" : "Entrega"}
            </span>
          )}
        </div>

        <div className="flex-none self-center border-l border-[color:var(--border)] pl-4 text-right">
          <p
            className="font-mono text-[31px] font-bold leading-none tracking-[-0.045em] tabular-nums"
            style={{ color: due ? "var(--state-cobrar)" : "var(--foreground)" }}
          >
            {formatCurrency(preOrder.totalCents)}
          </p>
          <p className="mt-1.5 text-[11px] text-[color:var(--muted-foreground)]">
            {due ? "a receber" : `${preOrder.items.length} item${preOrder.items.length !== 1 ? "s" : ""}`}
            {preOrder.discountCents > 0 && ` · -${formatCurrency(preOrder.discountCents)}`}
          </p>
        </div>
      </header>

      {!receiving && (
        <>
          <div role="tablist" aria-label="Detalhes do pedido" className="flex gap-0.5 border-b border-[color:var(--border)] bg-[color:var(--card)] px-5">
            <TabButton active={tab === "itens"} onClick={() => setTab("itens")}>
              Itens
            </TabButton>
            <TabButton active={tab === "historico"} onClick={() => setTab("historico")}>
              Histórico
            </TabButton>
            <TabButton active={tab === "entrega"} onClick={() => setTab("entrega")}>
              Entrega
            </TabButton>
          </div>

          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {tab === "itens" && (
              <>
                <ItemsTab preOrder={preOrder} />
                {/* Sem largura para a terceira coluna, o cupom volta para cá. */}
                <div className="mt-6 flex justify-center xl:hidden">
                  <ThermalTicket preOrder={preOrder} />
                </div>
              </>
            )}
            {tab === "historico" && <PreOrderTimeline preOrder={preOrder} now={now} />}
            {tab === "entrega" && (
              <DeliveryTab preOrder={preOrder} fulfillment={fulfillment} onTrack={onTrack} />
            )}
          </div>
        </>
      )}

      {receiving ? (
        <ReceivePanel
          preOrder={preOrder}
          submitting={converting}
          onCancel={onCancelReceive}
          onConfirm={onConfirmReceive}
        />
      ) : (
        <footer className="flex flex-wrap items-center gap-2.5 border-t border-[color:var(--border)] bg-[color:var(--card)] px-5 py-3.5">
          {primary && (
            <Button
              size="lg"
              loading={advancing}
              onClick={() => (primary.kind === "receive" ? onStartReceive() : onAdvance(primary.next))}
              leftIcon={<primary.icon className="h-4 w-4" />}
              style={
                primary.kind === "receive"
                  ? { background: "var(--state-cobrar-solid)", color: "var(--state-cobrar-on)" }
                  : undefined
              }
            >
              {primary.label}
              {primary.kind === "receive" && (
                <span className="font-mono font-bold tabular-nums">{formatCurrency(preOrder.totalCents)}</span>
              )}
            </Button>
          )}
          {secondary && (
            <Button
              variant="outline"
              disabled={advancing}
              onClick={() => (secondary.kind === "receive" ? onStartReceive() : onAdvance(secondary.next))}
              leftIcon={<secondary.icon className="h-4 w-4" />}
            >
              {secondary.label}
            </Button>
          )}
          <Button variant="ghost" onClick={onEdit} leftIcon={<Pencil className="h-4 w-4" />}>
            Editar
          </Button>
          <OverflowMenu onPrint={onPrint} onTrack={onTrack} onDelete={onDelete} />
          <p className="ml-auto hidden w-[220px] shrink-0 text-right text-[11.5px] leading-snug text-[color:var(--muted-foreground-strong)] 2xl:block">
            {primary?.kind === "receive"
              ? "Cria a venda e baixa o estoque. Você confere itens e total antes."
              : primary
                ? "Registra o horário. Não mexe em estoque nem em caixa."
                : "Este pedido já foi encerrado."}
          </p>
        </footer>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--ring)]",
        active
          ? "border-[color:var(--primary)] text-[color:var(--accent-foreground)]"
          : "border-transparent text-[color:var(--muted-foreground-strong)] hover:text-[color:var(--foreground)]",
      )}
    >
      {children}
    </button>
  );
}

/**
 * A leitura de conferência dos itens. É outra coisa que o cupom da terceira
 * coluna: lá é a prévia de impressão, aqui é a tabela para bater quantidade,
 * unitário e total antes de fechar.
 */
function ItemsTab({ preOrder }: { preOrder: PreOrder }) {
  return (
    <div className="max-w-2xl overflow-hidden rounded-xl border border-[color:var(--border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[color:var(--muted)] text-[10.5px] uppercase tracking-[0.08em] text-[color:var(--muted-foreground-strong)]">
            <th className="px-4 py-2.5 text-left font-bold">Produto</th>
            <th className="px-4 py-2.5 text-right font-bold">Qtd</th>
            <th className="px-4 py-2.5 text-right font-bold">Unitário</th>
            <th className="px-4 py-2.5 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {preOrder.items.map((item) => {
            const weight = weightOf(item);
            const total = item.priceCents * (weight !== null ? 1 : item.quantity);

            return (
              <tr key={item.id} className="border-t border-[color:var(--border)]">
                <td className="px-4 py-3 font-medium text-[color:var(--foreground)]">
                  <span className="flex items-center gap-2">
                    {weight !== null && (
                      <Scale className="h-3.5 w-3.5 flex-none text-[color:var(--muted-foreground-strong)]" aria-hidden="true" />
                    )}
                    {item.product.name}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-[color:var(--foreground)]">
                  {weight !== null ? `${weight.toFixed(3).replace(".", ",")} kg` : `${item.quantity} un`}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-[color:var(--muted-foreground-strong)]">
                  {weight !== null && item.product.pricePerKgCents
                    ? `${formatCurrency(item.product.pricePerKgCents)}/kg`
                    : formatCurrency(item.priceCents)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold tabular-nums text-[color:var(--foreground)]">
                  {formatCurrency(total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="border-t border-[color:var(--border)] px-4 py-3">
        <Total label="Subtotal" value={formatCurrency(preOrder.subtotalCents)} />
        {preOrder.discountCents > 0 && (
          <Total label="Desconto" value={`-${formatCurrency(preOrder.discountCents)}`} />
        )}
        {preOrder.deliveryFeeCents > 0 && (
          <Total label="Taxa de entrega" value={formatCurrency(preOrder.deliveryFeeCents)} />
        )}
        <p className="mt-2 flex items-baseline justify-between border-t border-[color:var(--border)] pt-2.5 text-lg font-bold text-[color:var(--foreground)]">
          <span>Total</span>
          <span className="font-mono tabular-nums">{formatCurrency(preOrder.totalCents)}</span>
        </p>
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-baseline justify-between py-0.5 text-[13px] text-[color:var(--muted-foreground-strong)]">
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </p>
  );
}

function DeliveryTab({
  preOrder,
  fulfillment,
  onTrack,
}: {
  preOrder: PreOrder;
  fulfillment: Fulfillment;
  onTrack: () => void;
}) {
  const address = preOrder.customer?.address;
  const addressLine =
    address && typeof address === "object"
      ? [address.street, address.number, address.neighborhood, address.city].filter(Boolean).join(", ")
      : null;

  if (fulfillment === "pickup") {
    return (
      <div className="flex max-w-md items-start gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-4">
        <Store className="mt-0.5 h-5 w-5 flex-none text-[color:var(--muted-foreground)]" />
        <div>
          <p className="text-sm font-semibold text-[color:var(--foreground)]">Retirada no balcão</p>
          <p className="mt-1 text-[13px] text-[color:var(--muted-foreground)]">O cliente retira no local.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-3">
      {fulfillment === "unknown" && (
        <p className="rounded-xl border border-dashed border-[color:var(--border-dark)] px-4 py-3 text-[13px] text-[color:var(--muted-foreground)]">
          Este pedido não registra se é entrega ou retirada — o cadastro ainda não guarda essa
          informação. Os dados abaixo vêm do cliente.
        </p>
      )}
      <dl className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] text-sm">
        <Field label="Endereço" value={addressLine ?? "Não cadastrado"} />
        <Field label="Entregador" value={preOrder.deliveryPerson?.name ?? "Não atribuído"} />
        <Field
          label="Previsão"
          value={preOrder.estimatedDeliveryTime ? formatDateTime(preOrder.estimatedDeliveryTime) : "Sem previsão"}
        />
        <Field label="Taxa" value={formatCurrency(preOrder.deliveryFeeCents)} />
      </dl>
      <Button variant="outline" onClick={onTrack} leftIcon={<MapPin className="h-4 w-4" />} className="self-start">
        Abrir rastreio
      </Button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[color:var(--border)] px-4 py-2.5 last:border-b-0">
      <dt className="text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className="text-right font-medium text-[color:var(--foreground)]">{value}</dd>
    </div>
  );
}

function OverflowMenu({
  onPrint,
  onTrack,
  onDelete,
}: {
  onPrint: () => void;
  onTrack: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        aria-label="Mais ações"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute bottom-full right-0 z-50 mb-2 w-48 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] py-1 shadow-dropdown"
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
          >
            <MenuItem
              onClick={() => {
                setOpen(false);
                onPrint();
              }}
              icon={<Printer className="h-4 w-4" />}
            >
              Imprimir comanda
            </MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                onTrack();
              }}
              icon={<MapPin className="h-4 w-4" />}
            >
              Rastrear entrega
            </MenuItem>
            <div className="my-1 border-t border-[color:var(--border)]" />
            <MenuItem
              destructive
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Excluir pré-pedido
            </MenuItem>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  children,
  icon,
  onClick,
  destructive,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors",
        destructive
          ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          : "text-[color:var(--foreground)] hover:bg-[color:var(--muted)]",
      )}
    >
      <span className="text-[color:var(--muted-foreground)]">{icon}</span>
      {children}
    </button>
  );
}

/**
 * O cupom como terceira coluna: fica sempre visível ao lado do dossiê, sem
 * disputar espaço com o histórico nem exigir uma guia para aparecer.
 */
export function TicketColumn({
  preOrder,
  onPrint,
}: {
  preOrder: PreOrder | null;
  onPrint: () => void;
}) {
  return (
    <aside
      aria-label="Comanda"
      className="scroll-slim hidden min-h-0 flex-col overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--background)] px-4 py-5 xl:flex"
    >
      {/* Sem pedido escolhido o próprio estado vazio já nomeia a coluna, e sem o
          título os três estados vazios alinham pelo mesmo topo. */}
      {preOrder && (
        <div className="mb-4 flex items-center gap-2 pl-2">
          <h3 className="flex-1 text-center text-[11px] font-bold uppercase tracking-[0.11em] text-[color:var(--muted-foreground-strong)]">
            Comanda
          </h3>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onPrint}
            title="Imprimir comanda"
            aria-label="Imprimir comanda"
            className="h-8 w-8 shrink-0"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      )}
      {preOrder ? (
        <div className="flex justify-center">
          <ThermalTicket preOrder={preOrder} />
        </div>
      ) : (
        <div className="flex flex-1 items-start justify-center pt-11">
          <EmptyState
            size="sm"
            variant="default"
            icon={Receipt}
            title="Sem comanda"
            description="A comanda do pedido escolhido aparece aqui, como sai na impressora."
          />
        </div>
      )}
    </aside>
  );
}
